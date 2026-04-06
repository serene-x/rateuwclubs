import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

type ClubRow = {
  name: string;
  description: string | null;
  tags: string[];
  link: string | null;
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

function capDesc(desc: string, max = 260) {
  const d = normalizeText(desc);
  if (!d) return "";
  return d.length > max ? d.slice(0, max - 3) + "…" : d;
}

// pull acronym out of parens at end of name, e.g. "Computer Science Club (CSC)" -> "csc"
function extractAcronym(name: string): string | null {
  const m = name.match(/\(([A-Za-z0-9-]{2,10})\)\s*$/);
  return m ? m[1].toLowerCase() : null;
}

// sites that show up on basically every uw page - not club-specific
const SITEWIDE_LINKS = [
  "instagram.com/yourwusa", "instagram.com/uofwaterloo",
  "twitter.com/uwaterloo", "facebook.com/waborloo",
  "youtube.com/@uwaterloo", "linkedin.com/school/uwaterloo",
  "tiktok.com/@uwaterloo", "facebook.com/uwaterloo",
];

const SOCIAL_DOMAINS = [
  "instagram.com", "facebook.com", "twitter.com",
  "youtube.com", "linkedin.com", "tiktok.com", "discord.",
];

// given a list of hrefs already filtered for sitewide junk,
// pick the best link: external website > instagram > null
function pickBestLink(hrefs: string[]): { website: string | null; instagram: string | null } {
  let website: string | null = null;
  let instagram: string | null = null;
  for (const h of hrefs) {
    if (!instagram && h.includes("instagram.com/")) instagram = h;
    if (!website && !SOCIAL_DOMAINS.some((d) => h.includes(d)) && !h.includes("mailto:")) {
      website = h;
    }
    if (website && instagram) break;
  }
  return { website, instagram };
}

// slug patterns that indicate a rec club on the athletics site
const REC_SLUGS = new Set([
  "dragon-boat", "lifesaving", "triathlon", "underwater-hockey",
  "fencing", "judo", "karate", "kendo", "muay-thai", "taekwondo",
  "wrestling", "boxing", "badminton", "tennis", "pickleball", "squash",
  "table-tennis", "dance", "ballroom", "cricket", "lacrosse", "quadball",
  "ringette", "soccer", "softball", "ultimate", "curling", "figure-skating",
  "hockey", "skiing", "cycling", "equestrian", "hiking", "rowing", "sailing",
  "powerlifting", "weightlifting", "esport", "warriors-band", "archery",
  "climbing", "volleyball", "swimming", "running",
]);

function looksLikeRecClub(href: string): boolean {
  if (href.includes("-club")) return true;
  const slug = href.split("/").pop() ?? "";
  return [...REC_SLUGS].some((s) => slug.includes(s));
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

  console.log(`[wusa] found ${detailLinks.size} club pages`);

  const clubs: ClubRow[] = [];
  const linksArr = Array.from(detailLinks);

  for (let i = 0; i < linksArr.length; i++) {
    const url = linksArr[i];

    const nav = await gotoWithRetry(page, url, 4);
    if (!nav.ok) {
      console.warn(`[wusa] failed: ${url} (${nav.status ?? "no status"}) ${nav.error ?? ""}`);      continue;
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

        // grab all external links on the page, filter out sitewide uw stuff
        const allLinks = Array.from(document.querySelectorAll("a[href]"))
          .map((a) => (a as HTMLAnchorElement).href.toLowerCase().replace(/\/$/, ""))
          .filter((h) => h.startsWith("http") && !h.includes("clubs.wusa.ca"));

        return { name, desc, hrefs: allLinks };
      });

      const name = normalizeText(extracted.name);
      let desc = normalizeText(extracted.desc);

      if (!name) {
        console.warn("[wusa] no name for:", url);
        continue;
      }

      if (desc.toLowerCase().startsWith(name.toLowerCase())) {
        desc = desc.slice(name.length).trim();
      }

      const shortDesc = capDesc(desc);
      const tags = inferTags(`${name} ${shortDesc}`);

      const filtered = extracted.hrefs.filter(
        (h: string) => !SITEWIDE_LINKS.some((sw) => h.includes(sw))
      );
      const { website, instagram } = pickBestLink(filtered);
      const link = website || instagram || url;

      clubs.push({ name, description: shortDesc || null, tags, link });

      if ((i + 1) % 20 === 0) console.log(`[wusa] scraped ${i + 1}/${linksArr.length}`);

      await sleep(250 + Math.floor(Math.random() * 350));
    } catch (e: any) {
      console.warn(`[wusa] failed (parse): ${url} ${String(e?.message ?? e)}`);
      await sleep(400 + Math.floor(Math.random() * 400));
    }
  }

  return clubs;
}

async function scrapeSedraDesignTeams(page: any): Promise<ClubRow[]> {
  const dirUrl = "https://uwaterloo.ca/sedra-student-design-centre/catalogs/directory-teams/category/all-student-design-teams";

  const nav = await gotoWithRetry(page, dirUrl, 4);
  if (!nav.ok) throw new Error(`[sedra] failed to load directory page: ${nav.status ?? ""}`);

  const teamEntries = await page.evaluate(() => {
    const clean = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();
    const root = document.querySelector("main") || document.body;
    const anchors = Array.from(root.querySelectorAll("a[href]")) as HTMLAnchorElement[];
    const entries: Array<{ name: string; desc: string; detailUrl: string }> = [];
    const seen = new Set<string>();

    for (const a of anchors) {
      const href = a.href;
      if (
        !href.includes("/catalogs/") ||
        (!href.includes("student-design-team") && !href.includes("directory-teams/"))
      ) continue;
      if (href.includes("category/")) continue;
      if (href.endsWith("/directory-teams")) continue;

      const name = clean(a.textContent ?? "");
      if (!name || name.length < 3) continue;

      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      let desc = "";
      const container = a.closest("div, li, article, td, section");
      if (container) {
        const fullText = clean(container.textContent ?? "");
        const nameIdx = fullText.indexOf(name);
        if (nameIdx >= 0) {
          desc = fullText.slice(nameIdx + name.length).trim();
        } else if (fullText.length > name.length + 5) {
          desc = fullText.replace(name, "").trim();
        }
      }

      entries.push({ name, desc, detailUrl: href });
    }

    return entries;
  });

  console.log(`[sedra] found ${teamEntries.length} team entries in catalog`);

  const clubs: ClubRow[] = [];

  for (let i = 0; i < teamEntries.length; i++) {
    const { detailUrl: teamUrl, name: catalogName, desc: catalogDesc } = teamEntries[i];
    const teamNav = await gotoWithRetry(page, teamUrl, 4);
    if (!teamNav.ok) {
      if (catalogName) {
        const shortDesc = capDesc(catalogDesc || "");
        const baseTags = new Set<string>(inferTags(`${catalogName} ${shortDesc}`));
        baseTags.add("Design Team");
        clubs.push({
          name: catalogName,
          description: shortDesc || null,
          tags: Array.from(baseTags).slice(0, 4),
          link: teamUrl,
        });
      }
      console.warn(`[sedra] failed detail page, using catalog data: ${teamUrl}`);
      continue;
    }

    try {
      await page.waitForTimeout(150 + Math.floor(Math.random() * 200));

      const extracted = await page.evaluate(() => {
        const clean = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();
        const root = document.querySelector("main") || document.body;

        const heading = root.querySelector("h1, h2");
        const name = clean(heading?.textContent ?? "");

        const desc = Array.from(root.querySelectorAll("p"))
          .map((p) => clean(p.textContent ?? ""))
          .filter((t) => t.length >= 20)
          .slice(0, 5)
          .join(" ");

        // grab links from both <a> tags and plain text urls (some sedra pages
        // have urls as raw text instead of actual hyperlinks lol)
        const fromAnchors = Array.from(document.querySelectorAll("a[href]"))
          .map((a) => (a as HTMLAnchorElement).href.toLowerCase().replace(/\/$/, ""));
        const bodyText = clean(root.textContent ?? "");
        const fromText = (bodyText.match(/https?:\/\/[^\s\])<>,]+/gi) || [])
          .map((u) => u.toLowerCase().replace(/\/$/, ""));
        const allHrefs = [...new Set([...fromAnchors, ...fromText])].filter(
          (h) => h.startsWith("http") && !h.includes("uwaterloo.ca")
        );

        return { name, desc, hrefs: allHrefs };
      });

      const name = normalizeText(extracted.name) || catalogName;
      if (!name) continue;

      const shortDesc = capDesc(extracted.desc || catalogDesc || "");

      const baseTags = new Set<string>(inferTags(`${name} ${shortDesc}`));
      baseTags.add("Design Team");

      const filtered = extracted.hrefs.filter(
        (h: string) => !SITEWIDE_LINKS.some((sw) => h.includes(sw))
      );
      const { website, instagram } = pickBestLink(filtered);
      const link = website || instagram || teamUrl;

      clubs.push({
        name,
        description: shortDesc || null,
        tags: Array.from(baseTags).slice(0, 4),
        link,
      });

      if ((i + 1) % 10 === 0) console.log(`[sedra] scraped ${i + 1}/${teamEntries.length}`);
      await sleep(300 + Math.floor(Math.random() * 300));
    } catch (e: any) {
      console.warn(`[sedra] failed (parse): ${teamUrl} ${String(e?.message ?? e)}`);
      await sleep(400);
    }
  }

  console.log(`[sedra] extracted ${clubs.length} teams with links`);
  return clubs;
}

async function scrapeAthleticsRecClubs(page: any): Promise<ClubRow[]> {
  const url = "https://athletics.uwaterloo.ca/sports/2012/9/4/Warrior_Recreation_Clubs.aspx";

  const nav = await gotoWithRetry(page, url, 4);
  if (!nav.ok) {
    console.warn(`[athletics] failed to load rec clubs page: ${nav.status ?? ""}`);    return [];
  }

  await page.waitForTimeout(1000);

  console.log(`[athletics] expanding category sections...`);

  const expandButtons = await page.$$("button, [role='button'], summary, .accordion-header, [aria-expanded]");
  for (const btn of expandButtons) {
    try {
      const text = await btn.textContent();
      const t = (text ?? "").toLowerCase();
      if (
        t.includes("aquatic") || t.includes("combat") || t.includes("court") ||
        t.includes("dance") || t.includes("field sport") || t.includes("ice sport") ||
        t.includes("outdoor") || t.includes("weight") || t.includes("esport") ||
        t.includes("band")
      ) {
        await btn.click();
        await sleep(300);
      }
    } catch {}
  }

  await page.waitForTimeout(500);

  // grab every athletics sport link, we'll filter for rec clubs on our side
  const rawLinks = await page.evaluate(() => {
    const clean = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();
    const anchors = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
    const entries: Array<{ name: string; link: string }> = [];
    const seen = new Set<string>();

    const skip = ["schedule", "roster", "registration", "membership",
      "employment", "volunteer", "ticket", "facility", "newsletter", "social-media",
      "archives", "pac-squash", "rock-climbing-wall", "directory",
      "field-hockey", "nordic-skiing"];

    for (const a of anchors) {
      const href = a.href;
      if (!href.includes("athletics.uwaterloo.ca/sports/")) continue;
      if (href.includes("Warrior_Recreation_Clubs")) continue;
      if (skip.some((s) => href.includes(s))) continue;
      // varsity teams have mens- or womens- in the url, skip those
      if (/\/(mens|womens)-/.test(href)) continue;

      const name = clean(a.textContent ?? "");
      if (!name || name.length < 4) continue;
      if (/learn more|sign up|news|directory/i.test(name)) continue;

      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      entries.push({ name, link: href });
    }
    return entries;
  });

  // only keep links that look like actual rec clubs
  const clubData = rawLinks.filter((e: { link: string }) => looksLikeRecClub(e.link));

  console.log(`[athletics] found ${clubData.length} rec clubs`);

  const clubs: ClubRow[] = [];

  for (const entry of clubData) {
    const name = normalizeText(entry.name);
    if (!name) continue;

    let clubName = name;
    if (!clubName.toLowerCase().includes("club") && !clubName.toLowerCase().includes("team") && !clubName.toLowerCase().includes("band")) {
      clubName = `${name} Club`;
    }

    const tags = inferTags(`${clubName}`);
    if (!tags.includes("Sports")) tags.unshift("Sports");
    if (tags.length > 4) tags.length = 4;

    clubs.push({
      name: clubName,
      description: null,
      tags,
      link: entry.link,
    });
  }

  return clubs;
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-CA",
  });

  const page = await context.newPage();

  await page.route("**/*", (route: any) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") return route.abort();
    return route.continue();
  });

  const wusa = await scrapeWusaClubs(page);
  const sedra = await scrapeSedraDesignTeams(page);
  const athletics = await scrapeAthleticsRecClubs(page);

  await browser.close();

  const merged = [...wusa, ...sedra, ...athletics];
  const seen = new Set<string>();
  const unique = merged.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`upserting ${unique.length} total (wusa + sedra + athletics) entries...`);

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);

    const { error } = await supabase.from("clubs").upsert(chunk, { onConflict: "name" });
    if (error) {
      console.error("Supabase upsert error:", error);
      throw error;
    }
  }

  console.log("done seeding (wusa + sedra + athletics)");

  // backfill: give every club in the db a link if it doesnt have one
  const { data: linkless, error: lfErr } = await supabase
    .from("clubs")
    .select("id, name")
    .is("link", null);

  if (lfErr) {
    console.error("backfill query error:", lfErr);
  } else if (linkless && linkless.length > 0) {
    console.log(`\n[backfill] ${linkless.length} clubs still have no link, matching against scraped data...`);

    // build lookup maps — one by normalized name, one by acronym
    const scrapedMap = new Map<string, string>();
    const acronymMap = new Map<string, string>();
    for (const c of unique) {
      if (!c.link) continue;
      scrapedMap.set(c.name.toLowerCase().replace(/[^a-z0-9]/g, ""), c.link);
      const acr = extractAcronym(c.name);
      if (acr) acronymMap.set(acr, c.link);
    }

    let filled = 0;

    for (const club of linkless) {
      const key = club.name.toLowerCase().replace(/[^a-z0-9]/g, "");

      let link: string | null = scrapedMap.get(key) ?? null;

      // try matching by acronym (e.g. "CSC" -> "Computer Science Club (CSC)")
      if (!link) {
        const acr = extractAcronym(club.name);
        if (acr) link = acronymMap.get(acr) ?? null;
        // also check if the club name itself IS an acronym that appears in a scraped name
        if (!link) {
          const asAcr = club.name.toLowerCase().replace(/[^a-z]/g, "");
          if (asAcr.length <= 6) link = acronymMap.get(asAcr) ?? null;
        }
      }

      if (!link) {
        const stripped = key
          .replace(/club$/, "")
          .replace(/team$/, "")
          .replace(/society$/, "")
          .replace(/association$/, "");
        for (const [sKey, sLink] of scrapedMap) {
          const sStripped = sKey
            .replace(/club$/, "")
            .replace(/team$/, "")
            .replace(/society$/, "")
            .replace(/association$/, "");
          if (stripped === sStripped || sKey.includes(stripped) || stripped.includes(sKey)) {
            link = sLink;
            break;
          }
        }
      }

      // no fallback — if we cant find a real link just leave it null
      if (!link) continue;

      const { error: upErr } = await supabase
        .from("clubs")
        .update({ link })
        .eq("id", club.id);

      if (upErr) {
        console.error(`  [backfill] error updating ${club.name}:`, upErr);
      } else {
        filled++;
      }
    }

    console.log(`[backfill] filled links for ${filled}/${linkless.length} clubs`);
  } else {
    console.log("\nall clubs already have links");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
