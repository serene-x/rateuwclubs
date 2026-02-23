import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type ClubRow = {
  name: string;
  description: string | null;
  tags: string[];
};

const GENERAL_STUDENT_CLUBS: string[] = [
  "African Student Association (ASA)",
  "AfroXDance Club",
  "Amnesty International",
  "Animusic Ensembles",
  "Armenian Students' Association",
  "Association of Caribbean Students (ACS)",
  "Aviation Society",
  "Black Association for Student Expression (UW BASE)",
  "Black Medical Leaders of Tomorrow",
  "UW Breakers",
  "Campus Crusade for Cheese",
  "UW Chess Club",
  "UW Chinese Christian Fellowship",
  "Chinese Students' Association (CSA)",
  "Christian Orthodox Campus-Ministry Association",
  "Christians on Campus",
  "UW Concert Band",
  "Contact Lens Interest Club (CLIC)",
  "UW Cooking Club",
  "Crafts 4 Charity",
  "Creators Collective",
  "UW DJ Club",
  "UW Debate Society",
  "Deception Board Games Club",
  "Egyptian Students' Association",
  "Engineers Without Borders",
  "Fashion for Change",
  "UW Fighting Game Club (UWFGC)",
  "FormulaTech",
  "Gujarati Students' Association (GSA)",
  "Her Campus Waterloo",
  "Hillel Waterloo",
  "Impact Alliance",
  "UW Improv Club",
  "UW Indian Cultural Association",
  "Indonesian Students' Association",
  "Iranian Students' Association of Waterloo",
  "Jamnetwork",
  "Kingdom Come",
  "Korean Christian Fellowship",
  "Law & Business Nexus (LBN)",
  "MEDLIFE UW",
  "Mambo Club",
  "Mandarin Chinese Christian Fellowship",
  "UW Marketing Association",
  "Mock Trial Club",
  "Muslim Students' Association – Orphan Sponsorship Program",
  "Muslim Students' Association (MSA)",
  "North African Student Association",
  "Pakistani Students' Association",
  "Pokemon Club",
  "Power to Change",
  "UW Pre-Optometry Club (UWPREOPT)",
  "Riichi Mahjong UW (RMUW)",
  "UW Rubik's Cube Club",
  "SMILE (Students for Mental Health and Inner Life Enrichment)",
  "Sikh Students' Association (SSA)",
  "UW Smash",
  "Socialist Fightback Club at Waterloo University",
  "UW Stand-up Club",
  "UW Board Games Club",
  "UW Book Club",
  "UW Builders Club",
  "UW Cuban Salsa Club",
  "UW Dhamaka",
  "UW Futures in Rehabilitation Sciences",
  "UW Kpop Club",
  "UW Mario Kart",
  "UW Mehfil",
  "UW Neurodivergence Alliance",
];

const STUDENT_SOCIETIES: string[] = [
  "Association of Health Students Undergraduate Members (AHSUM)",
  "Arts Student Union (ASU)",
  "Accounting & Finance Student Association (AFSA)",
  "Engineering Society (EngSoc)",
  "Environment Students Society (ESS)",
  "Mathematics Society (MathSoc)",
  "Science Society (SciSoc)",
  "Society of Pharmacy Students (SOPhS)",
  "Waterloo Optometry Student Society (UWOSS)",
  "Waterloo Architecture Student Association (WASA)",
  "Global Business and Digital Arts (GBDA) Society",
  "Graduate Student Association (GSA-UW)",
  "UW DECA",
];

const FINANCE_AND_BUSINESS: string[] = [
  "Accounting & Finance Endowment Fund (AFEF)",
  "hEDGE Conference",
  "University of Waterloo Accounting Conference (UWAC)",
  "Accounting & Finance Orientation Week (AFOW)",
  "UWaterloo Women in Finance (WIF)",
  "Young Tax Professionals (YTP)",
  "ACE Consulting",
  "Non-Profit Organization Consulting (NPOC)",
  "School of Accounting & Finance Outreach Ambassador Program (SOAP)",
];

const DESIGN_AND_ENGINEERING_TEAMS: string[] = [
  "Baja SAE",
  "Battery Workforce Challenge",
  "Concrete Canoe Team",
  "Concrete Toboggan Team",
  "Electrium Mobility",
  "F_RMlab",
  "Formula Nano",
  "UW Formula Electric (UWFE)",
  "Hacker Fab (Waterloo Hacker Fab)",
  "Industry 4.0 Team",
  "iGEM (International Genetically Engineered Machine)",
  "MedTechResolve",
  "Midnight Sun Solar Car Team",
  "UW Robotics Team (UWRT)",
  "Steel Bridge Design Team",
  "Waterloo Alternative Protein Project",
  "UWAFT (Alt Fuel Team)",
  "UWaterloo IISE",
  "UWASIC",
  "UW Biomechatronics Design Team (Biotron)",
  "UW Blueprint",
  "UW Orbital",
  "UW REACT (FIRST Robotics)",
  "UW Reality Labs",
  "Waterloo Space Research Team",
  "UW VEX U Robotics Team",
  "UWSiO",
  "Warrior Home Design Team",
  "Wat Street",
  "WAT.ai",
  "WatArrow",
  "Waterloo Aerial Robotics Group (WARG)",
  "Waterloo Rocketry Team",
  "Waterloop",
  "Waterloo RoboSoccer Team",
  "WATFlow",
  "WATOLINK",
  "WATonomous",
  "UW Nanorobotics Group",
];

const SPORTS_AND_RECREATION: string[] = [
  "Artistic Swimming Club",
  "Dragon Boat Club",
  "Lifesaving Club",
  "Triathlon Club",
  "Underwater Hockey",
  "Chinese Martial Arts Club",
  "Fencing Club",
  "Judo Club",
  "Karate & Jujitsu Club",
  "Kendo Club",
  "Muay Thai Club",
  "Taekwondo Club",
  "Wrestling Club",
  "Badminton Club",
  "Ball Hockey Club",
  "Pickleball Club",
  "Table Tennis Club",
  "Tennis Club",
  "Serve Volleyball Club",
  "Ballroom Dance Club",
  "Waterloo Dance Club",
  "Cricket Club",
  "Lacrosse Club",
  "Quadball Club",
  "Softball Club",
  "Ultimate Club",
  "Women's Football Club",
  "Curling Club",
  "Figure Skating Club",
  "Ringette Club",
  "Outers Club",
  "Archery Club",
  "Cycling Club",
  "Equestrian Club",
  "Running Club",
  "Juggling Club",
  "Climbing Club",
  "Strength Club",
  "Esports Club",
  "Warriors Band",
];

function inferTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags = new Set<string>();

  const rules: Array<[string, string[]]> = [
    ["Design", ["design", "ux", "ui", "product design", "graphic"]],
    ["Tech", ["software", "coding", "programming", "developer", "hack", "ai", "ml", "data"]],
    ["Engineering", ["robot", "formula", "mechanical", "electrical", "civil", "mechatronics", "bridge", "canoe", "toboggan", "solar", "vehicle", "rocket"]],
    ["Business", ["consulting", "finance", "investment", "marketing", "entrepreneur", "accounting", "tax", "business"]],
    ["Sports", ["sport", "athletic", "fitness", "gym", "run", "basketball", "soccer", "hockey", "swim", "fencing", "judo", "karate", "taekwondo", "wrestling", "badminton", "tennis", "volleyball", "cricket", "lacrosse", "softball", "curling", "skating", "cycling", "climbing", "archery", "equestrian", "triathlon", "dragon boat", "martial art", "kendo", "muay thai", "pickleball", "quadball", "football", "ringette", "juggling", "strength"]],
    ["Arts", ["music", "dance", "theatre", "film", "photography", "art", "band", "improv", "stand-up", "fashion", "dj"]],
    ["Culture", ["cultural", "heritage", "language", "community", "diaspora", "african", "caribbean", "armenian", "chinese", "egyptian", "gujarati", "indian", "indonesian", "iranian", "korean", "north african", "pakistani", "sikh", "muslim", "christian", "orthodox", "jewish", "salsa", "kpop"]],
    ["Volunteer", ["volunteer", "charity", "outreach", "non-profit", "fundrais", "engineers without borders", "medlife"]],
    ["Academic", ["math", "physics", "chem", "biology", "research", "academic", "optometry", "pharmacy", "health", "science", "rehabilitation", "protein", "igem"]],
    ["Gaming", ["game", "esports", "board game", "dnd", "rpg", "smash", "mario kart", "pokemon", "mahjong", "chess", "rubik"]],
    ["Design Team", ["baja", "canoe", "toboggan", "formula", "solar car", "robotics team", "rocketry", "waterloop", "warg", "blueprint", "orbital", "vex", "uwrt", "uwfe", "midnight sun", "electrium", "battl", "wat.ai", "watomous", "watonomous", "watflow", "watolink", "uwasic", "uwsio", "reality labs", "hacker fab", "nanorobot", "f_rmlab", "biomech", "robo"]],
  ];

  for (const [tag, keywords] of rules) {
    if (keywords.some((k) => t.includes(k))) tags.add(tag);
  }

  return Array.from(tags).slice(0, 4);
}

function buildRows(
  names: string[],
  categoryTag: string,
): ClubRow[] {
  return names.map((name) => {
    const inferred = inferTags(name);
    const tagSet = new Set([categoryTag, ...inferred]);
    return {
      name,
      description: null,
      tags: Array.from(tagSet).slice(0, 4),
    };
  });
}

async function main() {
  const all: ClubRow[] = [
    ...buildRows(GENERAL_STUDENT_CLUBS, "Student Club"),
    ...buildRows(STUDENT_SOCIETIES, "Student Society"),
    ...buildRows(FINANCE_AND_BUSINESS, "Business"),
    ...buildRows(DESIGN_AND_ENGINEERING_TEAMS, "Design Team"),
    ...buildRows(SPORTS_AND_RECREATION, "Sports"),
  ];

  // Deduplicate by normalised name
  const seen = new Set<string>();
  const unique = all.filter((c) => {
    const key = c.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Upserting ${unique.length} clubs into Supabase...`);

  const chunkSize = 100;
  let inserted = 0;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);

    const { error } = await supabase
      .from("clubs")
      .upsert(chunk, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      console.error("Supabase upsert error:", error);
      throw error;
    }

    inserted += chunk.length;
    console.log(`  ✓ ${inserted}/${unique.length}`);
  }

  console.log(`\nDone! ${unique.length} clubs seeded.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
