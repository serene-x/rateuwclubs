import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

type ClubRow = {
  name: string;
  description: string | null;
  tags: string[];
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function inferTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags = new Set<string>();

  const rules: Array<[string, string[]]> = [
    ["Design", ["design", "ux", "ui", "product design", "graphic"]],
    ["Tech", ["software", "coding", "programming", "developer", "hack", "ai", "ml", "data"]],
    ["Engineering", ["robot", "formula", "mechanical", "electrical", "civil", "mechatronics", "bridge", "canoe", "toboggan", "solar", "vehicle", "rocket"]],
    ["Business", ["consulting", "finance", "investment", "marketing", "entrepreneur", "accounting", "tax", "business"]],
    ["Sports", ["sport", "athletic", "fitness", "gym", "run", "basketball", "soccer", "hockey", "swim", "fencing", "judo", "karate", "taekwondo", "wrestling", "badminton", "tennis", "volleyball", "cricket", "lacrosse", "softball", "curling", "skating", "cycling", "climbing", "archery", "equestrian", "triathlon", "dragon boat", "martial art", "kendo", "muay thai", "pickleball", "quadball", "football", "ringette"]],
    ["Arts", ["music", "dance", "theatre", "film", "photography", "art", "band", "improv", "stand-up", "fashion", "dj"]],
    ["Culture", ["cultural", "heritage", "language", "community", "diaspora", "african", "caribbean", "armenian", "chinese", "egyptian", "gujarati", "indian", "indonesian", "iranian", "korean", "pakistani", "sikh", "muslim", "christian", "orthodox", "jewish", "salsa", "kpop"]],
    ["Volunteer", ["volunteer", "charity", "outreach", "non-profit", "fundrais", "engineers without borders", "medlife"]],
    ["Academic", ["math", "physics", "chem", "biology", "research", "academic", "optometry", "pharmacy", "health", "science", "rehabilitation", "protein", "igem"]],
    ["Gaming", ["game", "esports", "board game", "dnd", "rpg", "smash", "mario kart", "pokemon", "mahjong", "chess", "rubik"]],
  ];

  for (const [tag, keywords] of rules) {
    if (keywords.some((k) => t.includes(k))) tags.add(tag);
  }

  return Array.from(tags).slice(0, 4);
}

function normalizeText(s: string) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function gotoWithRetry(page: any, url: string, maxAttempts = 4) {
  let lastStatus: number | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });

      lastStatus = resp ? resp.status() : null;

      if (lastStatus && lastStatus >= 400) {
        throw new Error(`HTTP ${lastStatus}`);
      }

      return { ok: true, status: lastStatus };
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const backoff = 800 * attempt + Math.floor(Math.random() * 400);
      const extra =
        msg.includes("429") || msg.toLowerCase().includes("rate")
          ? 2500 * attempt
          : 0;

      if (attempt < maxAttempts) {
        await sleep(backoff + extra);
        continue;
      }

      return { ok: false, status: lastStatus, error: msg };
    }
  }

  return { ok: false, status: lastStatus, error: "Unknown failure" };
}

function capDesc(desc: string) {
  const d = normalizeText(desc);
  if (!d) return "";
  return d.length > 260 ? d.slice(0, 257) + "…" : d;
}

async function scrapeWusaClubs(page: any): Promise<ClubRow[]> {
  const base = "https://clubs.wusa.ca/club_listings";
  const baseNav = await gotoWithRetry(page, base, 4);
  if (!baseNav.ok) throw new Error(`Failed to load WUSA listings: ${baseNav.status ?? ""}`);

  const detailLinks = new Set<string>();

  while (true) {
    const links = await page.$$eval("a", (as: Element[]) => {
      const out: string[] = [];
      for (const a of as) {
        const href = (a as HTMLAnchorElement).href;
        if (!href) continue;
        try {
          const u = new URL(href);
          if (/^\/clubs\/\d+$/.test(u.pathname)) out.push(u.toString());
        } catch {}
      }
      return out;
    });

    links.forEach((l: string) => detailLinks.add(l));

    const next = await page.$("a[rel='next'], a:has-text('Next')");
    if (!next) break;

    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 120000 }),
      next.click(),
    ]);

    await sleep(300 + Math.floor(Math.random() * 250));
  }

  console.log(`[WUSA] Found ${detailLinks.size} club pages.`);

  const clubs: ClubRow[] = [];
  const linksArr = Array.from(detailLinks);

  for (let i = 0; i < linksArr.length; i++) {
    const url = linksArr[i];

    const nav = await gotoWithRetry(page, url, 4);
    if (!nav.ok) {
      console.warn(`[WUSA] Failed: ${url} (${nav.status ?? "no status"}) ${nav.error ?? ""}`);
      continue;
    }

    try {
      await page.waitForTimeout(150 + Math.floor(Math.random() * 250));

      const extracted = await page.evaluate(() => {
        const clean = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();

        const firstHeading = document.querySelector("h1,h2,h3,h4,h5,h6");
        const nameFromHeading = clean(firstHeading?.textContent ?? "");

        const title = clean(document.title ?? "");
        const nameFromTitle = clean(title.replace(/\s*\|\s*.*$/, ""));

        const name = nameFromHeading || nameFromTitle;

        const root = document.querySelector("main") || document.body;

        let desc = "";
        const whoNode = Array.from(root.querySelectorAll("*")).find((el) => {
          const t = clean(el.textContent ?? "");
          return t.toLowerCase() === "who we are";
        });

        if (whoNode) {
          const parent = whoNode.parentElement;
          if (parent) {
            const children = Array.from(parent.children);
            const startIdx = children.indexOf(whoNode as Element);

            const parts: string[] = [];
            for (let j = startIdx + 1; j < children.length; j++) {
              const el = children[j];
              const t = clean(el.textContent ?? "");
              if (!t) continue;

              if (/^h[1-6]$/.test(el.tagName.toLowerCase()) && parts.length > 0) break;

              parts.push(t);
              if (parts.join(" ").length > 1200) break;
            }
            desc = parts.join(" ");
          }
        }

        if (!desc) {
          const ps = Array.from(root.querySelectorAll("p"))
            .map((p) => clean(p.textContent ?? ""))
            .filter((t) => t.length >= 40);
          if (ps.length > 0) desc = ps.slice(0, 3).join(" ");
        }

        if (!desc) desc = clean(root.textContent ?? "");

        return { name, desc };
      });

      const name = normalizeText(extracted.name);
      let desc = normalizeText(extracted.desc);

      if (!name) {
        console.warn("[WUSA] No name extracted for:", url);
        continue;
      }

      if (desc.toLowerCase().startsWith(name.toLowerCase())) {
        desc = desc.slice(name.length).trim();
      }

      const shortDesc = capDesc(desc);
      const tags = inferTags(`${name} ${shortDesc}`);

      clubs.push({ name, description: shortDesc || null, tags });

      if ((i + 1) % 20 === 0) console.log(`[WUSA] Scraped ${i + 1}/${linksArr.length}`);

      await sleep(250 + Math.floor(Math.random() * 350));
    } catch (e: any) {
      console.warn(`[WUSA] Failed (parse): ${url} ${String(e?.message ?? e)}`);
      await sleep(400 + Math.floor(Math.random() * 400));
    }
  }

  return clubs;
}

async function scrapeSedraDesignTeams(page: any): Promise<ClubRow[]> {
  // This page contains the design teams with “Read more” sections and is easier to parse reliably.
  const url = "https://uwaterloo.ca/sedra-student-design-centre/directory-teams";

  const nav = await gotoWithRetry(page, url, 4);
  if (!nav.ok) throw new Error(`[SEDRA] Failed to load directory page: ${nav.status ?? ""}`);

  // Parse each team section from headings + following text until next heading.
  const teams = await page.evaluate(() => {
    const clean = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();
    const root = document.querySelector("main") || document.body;

    // Team names appear as headings like "## Baja SAE" etc on this page. :contentReference[oaicite:1]{index=1}
    const headings = Array.from(root.querySelectorAll("h2, h3"))
      .map((h) => h as HTMLElement)
      .map((h) => ({ el: h, text: clean(h.textContent ?? "") }))
      .filter((h) => h.text && !h.text.toLowerCase().includes("information about"));

    const out: Array<{ name: string; desc: string }> = [];

    for (const h of headings) {
      const name = h.text;
      if (!name) continue;

      const parts: string[] = [];
      let el: Element | null = h.el.nextElementSibling;

      while (el) {
        const tag = el.tagName.toLowerCase();

        // Stop at next team heading
        if (tag === "h2" || tag === "h3") break;

        // Skip buttons/utility text like "Read more" itself
        const t = clean(el.textContent ?? "");
        if (
          t &&
          t.toLowerCase() !== "read more" &&
          t.toLowerCase() !== "read less" &&
          !t.toLowerCase().includes("contact the sedra") &&
          !t.toLowerCase().includes("information about sedra")
        ) {
          parts.push(t);
        }

        if (parts.join(" ").length > 1400) break;
        el = el.nextElementSibling;
      }

      const desc = clean(parts.join(" "));
      out.push({ name, desc });
    }

    // Deduplicate by name (sometimes headings repeat in nav)
    const seen = new Set<string>();
    return out.filter((x) => {
      const k = x.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  });

  console.log(`[SEDRA] Extracted ${teams.length} team entries from directory.`);

  const mapped: ClubRow[] = teams
    .map((t: any) => {
      const name = normalizeText(t.name);
      const shortDesc = capDesc(t.desc || "");
      if (!name) return null;

      const baseTags = new Set<string>(inferTags(`${name} ${shortDesc}`));
      baseTags.add("Design Team");

      return {
        name,
        description: shortDesc || null,
        tags: Array.from(baseTags).slice(0, 4),
      } satisfies ClubRow;
    })
    .filter(Boolean) as ClubRow[];

  return mapped;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-CA",
  });

  const page = await context.newPage();

  // Block heavy resources (faster + fewer bans)
  await page.route("**/*", (route: any) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") return route.abort();
    return route.continue();
  });

  const wusa = await scrapeWusaClubs(page);
  const sedra = await scrapeSedraDesignTeams(page);

  await browser.close();

  // Merge + dedupe by name (case-insensitive)
  const merged = [...wusa, ...sedra];
  const seen = new Set<string>();
  const unique = merged.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Upserting ${unique.length} total (WUSA + Sedra) entries...`);

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);

    const { error } = await supabase.from("clubs").upsert(chunk, { onConflict: "name" });
    if (error) {
      console.error("Supabase upsert error:", error);
      throw error;
    }
  }

  console.log("Done seeding (WUSA + Sedra).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
