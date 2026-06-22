// ===== پیکربندی بازی Empire Wars =====

export type ResourceKey = "gold" | "food" | "stone" | "iron" | "gems";

export const RESOURCE_INFO: Record<
  string,
  { name: string; emoji: string }
> = {
  gold: { name: "طلا", emoji: "💰" },
  food: { name: "غذا", emoji: "🌾" },
  stone: { name: "سنگ", emoji: "⛏️" },
  iron: { name: "آهن", emoji: "⚙️" },
  gems: { name: "جم", emoji: "💎" },
};

export type BuildingKey =
  | "command"
  | "goldmine"
  | "farm"
  | "stonemine"
  | "ironworks"
  | "warehouse"
  | "barracks"
  | "lab"
  | "market"
  | "wall";

export interface BuildingDef {
  key: BuildingKey;
  name: string;
  emoji: string;
  desc: string;
  // پایه هزینه ارتقا
  baseCost: Partial<Record<ResourceKey, number>>;
  // ضریب رشد هزینه به ازای هر سطح
  costFactor: number;
  maxLevel: number;
}

export const BUILDINGS: Record<BuildingKey, BuildingDef> = {
  command: {
    key: "command",
    name: "مرکز فرماندهی",
    emoji: "🏰",
    desc: "قلب شهر؛ سطح آن سقف سطح بقیه ساختمان‌ها را تعیین می‌کند.",
    baseCost: { gold: 200, stone: 150, iron: 80 },
    costFactor: 1.6,
    maxLevel: 30,
  },
  goldmine: {
    key: "goldmine",
    name: "معدن طلا",
    emoji: "🪙",
    desc: "تولید طلا در هر ساعت.",
    baseCost: { gold: 80, stone: 60 },
    costFactor: 1.45,
    maxLevel: 30,
  },
  farm: {
    key: "farm",
    name: "مزرعه",
    emoji: "🌾",
    desc: "تولید غذا در هر ساعت.",
    baseCost: { gold: 80, stone: 60 },
    costFactor: 1.45,
    maxLevel: 30,
  },
  stonemine: {
    key: "stonemine",
    name: "معدن سنگ",
    emoji: "🪨",
    desc: "تولید سنگ در هر ساعت.",
    baseCost: { gold: 80, food: 60 },
    costFactor: 1.45,
    maxLevel: 30,
  },
  ironworks: {
    key: "ironworks",
    name: "کارخانه آهن",
    emoji: "🏭",
    desc: "تولید آهن در هر ساعت.",
    baseCost: { gold: 120, stone: 80 },
    costFactor: 1.5,
    maxLevel: 30,
  },
  warehouse: {
    key: "warehouse",
    name: "انبار",
    emoji: "📦",
    desc: "افزایش ظرفیت ذخیره منابع.",
    baseCost: { gold: 100, stone: 120 },
    costFactor: 1.4,
    maxLevel: 30,
  },
  barracks: {
    key: "barracks",
    name: "پادگان",
    emoji: "🛡️",
    desc: "آموزش نیروی نظامی.",
    baseCost: { gold: 150, iron: 80, stone: 60 },
    costFactor: 1.5,
    maxLevel: 30,
  },
  lab: {
    key: "lab",
    name: "آزمایشگاه",
    emoji: "🔬",
    desc: "تحقیق و توسعه فناوری.",
    baseCost: { gold: 200, iron: 120 },
    costFactor: 1.55,
    maxLevel: 20,
  },
  market: {
    key: "market",
    name: "بازار",
    emoji: "🏪",
    desc: "تجارت منابع با بازیکنان دیگر.",
    baseCost: { gold: 150, stone: 100 },
    costFactor: 1.5,
    maxLevel: 20,
  },
  wall: {
    key: "wall",
    name: "دیوار دفاعی",
    emoji: "🧱",
    desc: "کاهش خسارت حملات دشمن.",
    baseCost: { stone: 200, iron: 100 },
    costFactor: 1.5,
    maxLevel: 30,
  },
};

// ساختمان تولیدکننده هر منبع و میزان پایه تولید در ساعت
export const PRODUCTION: Record<
  string,
  { resource: ResourceKey; base: number }
> = {
  goldmine: { resource: "gold", base: 120 },
  farm: { resource: "food", base: 100 },
  stonemine: { resource: "stone", base: 80 },
  ironworks: { resource: "iron", base: 60 },
};

export type TroopKey = "soldier" | "archer" | "knight" | "warmachine";

export interface TroopDef {
  key: TroopKey;
  name: string;
  emoji: string;
  attack: number;
  defense: number;
  cost: Partial<Record<ResourceKey, number>>;
  power: number;
}

export const TROOPS: Record<TroopKey, TroopDef> = {
  soldier: {
    key: "soldier",
    name: "سرباز",
    emoji: "⚔️",
    attack: 10,
    defense: 8,
    cost: { gold: 40, food: 20 },
    power: 10,
  },
  archer: {
    key: "archer",
    name: "تیرانداز",
    emoji: "🏹",
    attack: 22,
    defense: 12,
    cost: { gold: 80, food: 30, iron: 20 },
    power: 22,
  },
  knight: {
    key: "knight",
    name: "شوالیه",
    emoji: "🐎",
    attack: 50,
    defense: 40,
    cost: { gold: 200, food: 60, iron: 80 },
    power: 50,
  },
  warmachine: {
    key: "warmachine",
    name: "ماشین جنگی",
    emoji: "💣",
    attack: 140,
    defense: 90,
    cost: { gold: 600, iron: 300, stone: 150 },
    power: 140,
  },
};

export type ResearchKey = "economy" | "speed" | "defense" | "attack" | "training";

export interface ResearchDef {
  key: ResearchKey;
  name: string;
  emoji: string;
  desc: string;
  perLevel: string;
  baseCost: Partial<Record<ResourceKey, number>>;
  costFactor: number;
  maxLevel: number;
}

export const RESEARCH: Record<ResearchKey, ResearchDef> = {
  economy: {
    key: "economy",
    name: "اقتصاد پیشرفته",
    emoji: "📈",
    desc: "افزایش تولید همه منابع.",
    perLevel: "+۱۰٪ درآمد در هر سطح",
    baseCost: { gold: 400, iron: 150, gems: 0 },
    costFactor: 1.7,
    maxLevel: 10,
  },
  speed: {
    key: "speed",
    name: "مهندسی سریع",
    emoji: "⚡",
    desc: "افزایش بازده ساخت و آموزش.",
    perLevel: "+۲۰٪ سرعت ساخت در هر سطح",
    baseCost: { gold: 350, stone: 200 },
    costFactor: 1.7,
    maxLevel: 10,
  },
  defense: {
    key: "defense",
    name: "تاکتیک دفاعی",
    emoji: "🛡️",
    desc: "افزایش قدرت دفاعی نیروها.",
    perLevel: "+۱۵٪ دفاع در هر سطح",
    baseCost: { gold: 350, iron: 200 },
    costFactor: 1.7,
    maxLevel: 10,
  },
  attack: {
    key: "attack",
    name: "آموزش رزمی",
    emoji: "⚔️",
    desc: "افزایش قدرت حمله همه نیروها.",
    perLevel: "+۱۵٪ قدرت حمله در هر سطح",
    baseCost: { gold: 400, iron: 220 },
    costFactor: 1.7,
    maxLevel: 10,
  },
  training: {
    key: "training",
    name: "تمرین سریع",
    emoji: "🏋️",
    desc: "کاهش هزینه آموزش نیروها.",
    perLevel: "-۵٪ هزینه آموزش در هر سطح",
    baseCost: { gold: 300, food: 200 },
    costFactor: 1.7,
    maxLevel: 8,
  },
};

// بسته‌های جم در فروشگاه
export const GEM_PACKS = [
  { gems: 100, price: "۹۹٬۰۰۰ تومان", priceRaw: "99000", bonus: 0 },
  { gems: 500, price: "۳۹۹٬۰۰۰ تومان", priceRaw: "399000", bonus: 50 },
  { gems: 1000, price: "۶۹۹٬۰۰۰ تومان", priceRaw: "699000", bonus: 200 },
];

// ===== تنظیمات پرداخت (این‌ها را با اطلاعات خودت عوض کن) =====
// شماره کارت برای واریز کاربران
export const PAYMENT_CARD = "6037-9977-1234-5678";
export const PAYMENT_CARD_HOLDER = "نام صاحب حساب";
// رمز عبور پنل ادمین (حتماً عوضش کن)
export const ADMIN_PASSWORD = "admin1234";

// پاداش روزانه ۷ روزه
export const DAILY_REWARDS = [
  { day: 1, gold: 100, gems: 0 },
  { day: 2, gold: 200, gems: 0 },
  { day: 3, gold: 300, gems: 0 },
  { day: 4, gold: 500, gems: 0 },
  { day: 5, gold: 800, gems: 0 },
  { day: 6, gold: 1200, gems: 0 },
  { day: 7, gold: 0, gems: 30 },
];

// مأموریت‌های روزانه
export const DAILY_MISSIONS = [
  { id: "attack", title: "۱ حمله موفق انجام بده", reward: { gold: 300, gems: 0 } },
  { id: "upgrade", title: "۱ ساختمان ارتقا بده", reward: { gold: 250, gems: 0 } },
  { id: "train", title: "۵ نیرو آموزش بده", reward: { gold: 200, gems: 5 } },
  { id: "collect", title: "منابع شهرت را جمع‌آوری کن", reward: { gold: 150, gems: 0 } },
];

// مأموریت‌های هفتگی
export const WEEKLY_MISSIONS = [
  { id: "clanwar", title: "در جنگ کلن مشارکت کن", reward: { gold: 0, gems: 30 } },
  { id: "invite", title: "۱ دوست را دعوت کن", reward: { gold: 1000, gems: 10 } },
  { id: "citylevel", title: "شهرت را ارتقا بده", reward: { gold: 800, gems: 0 } },
];

// اسکین‌های شهر و پروفایل (با جم خریداری می‌شوند)
export interface SkinDef {
  id: string;
  name: string;
  emoji: string;
  type: "city" | "profile";
  price: number; // جم (۰ = پیش‌فرض رایگان)
}

export const SKINS: SkinDef[] = [
  { id: "default", name: "پیش‌فرض", emoji: "🏰", type: "city", price: 0 },
  { id: "snow", name: "قلعه برفی", emoji: "🏔️", type: "city", price: 200 },
  { id: "desert", name: "شهر صحرا", emoji: "🏜️", type: "city", price: 200 },
  { id: "volcano", name: "قلعه آتش‌فشان", emoji: "🌋", type: "city", price: 400 },
  { id: "default_p", name: "پیش‌فرض", emoji: "👑", type: "profile", price: 0 },
  { id: "dragon", name: "اژدها", emoji: "🐉", type: "profile", price: 150 },
  { id: "lion", name: "شیر", emoji: "🦁", type: "profile", price: 150 },
  { id: "phoenix", name: "ققنوس", emoji: "🔥", type: "profile", price: 300 },
];

// پاداش‌های پلکانی دعوت (تعداد دعوت → جایزه)
export const INVITE_MILESTONES = [
  { count: 5, gems: 50, label: "۵ دعوت = ۵۰ جم" },
  { count: 10, gems: 150, label: "۱۰ دعوت = ۱۵۰ جم" },
  { count: 20, gems: 400, label: "۲۰ دعوت = اسکین ویژه + ۴۰۰ جم" },
];

// دستاوردها
export const ACHIEVEMENTS = [
  { id: "atk1", title: "اولین حمله موفق", check: "attacksWon", target: 1, reward: { gems: 10 } },
  { id: "atk10", title: "۱۰ حمله موفق", check: "attacksWon", target: 10, reward: { gems: 30 } },
  { id: "atk100", title: "۱۰۰ حمله موفق", check: "attacksWon", target: 100, reward: { gems: 100 } },
  { id: "lvl10", title: "رسیدن به سطح ۱۰", check: "level", target: 10, reward: { gems: 50 } },
  { id: "lvl50", title: "رسیدن به سطح ۵۰", check: "level", target: 50, reward: { gems: 300 } },
  { id: "gold100k", title: "کسب ۱۰۰٬۰۰۰ طلا", check: "totalGoldEarned", target: 100000, reward: { gems: 80 } },
  { id: "inv1", title: "اولین دعوت موفق", check: "inviteCount", target: 1, reward: { gems: 15 } },
  { id: "inv10", title: "۱۰ دعوت موفق", check: "inviteCount", target: 10, reward: { gems: 120 } },
];

export const MARKET_FEE = 0.05; // ۵٪ کارمزد

// محاسبه هزینه ارتقا ساختمان در سطح فعلی
export function buildingUpgradeCost(
  key: BuildingKey,
  currentLevel: number
): Partial<Record<ResourceKey, number>> {
  const def = BUILDINGS[key];
  const factor = Math.pow(def.costFactor, currentLevel);
  const out: Partial<Record<ResourceKey, number>> = {};
  for (const [res, amt] of Object.entries(def.baseCost)) {
    out[res as ResourceKey] = Math.floor(amt * factor);
  }
  return out;
}

// محاسبه هزینه تحقیق
export function researchUpgradeCost(
  key: ResearchKey,
  currentLevel: number
): Partial<Record<ResourceKey, number>> {
  const def = RESEARCH[key];
  const factor = Math.pow(def.costFactor, currentLevel);
  const out: Partial<Record<ResourceKey, number>> = {};
  for (const [res, amt] of Object.entries(def.baseCost)) {
    out[res as ResourceKey] = Math.floor(amt * factor);
  }
  return out;
}

// ظرفیت انبار بر اساس سطح
export function warehouseCapacity(level: number): number {
  return 2000 + level * 2500;
}

// ===== تایمرها =====
// زمان ساخت/ارتقا ساختمان (ثانیه) — با تحقیق «مهندسی سریع» کاهش می‌یابد
export function buildingTimeSeconds(
  currentLevel: number,
  speedResearchLevel = 0
): number {
  // پایه ۳۰ ثانیه + رشد با سطح
  const base = 30 + Math.floor(15 * Math.pow(1.5, currentLevel));
  const speedMult = 1 / (1 + speedResearchLevel * 0.2);
  return Math.max(5, Math.floor(base * speedMult));
}

// زمان آموزش نیرو (ثانیه به ازای هر نیرو)
export function troopTrainSeconds(
  troop: TroopKey,
  qty: number,
  trainingResearchLevel = 0
): number {
  const per: Record<TroopKey, number> = {
    soldier: 3,
    archer: 6,
    knight: 12,
    warmachine: 30,
  };
  const speedMult = 1 / (1 + trainingResearchLevel * 0.08);
  return Math.max(2, Math.floor(per[troop] * qty * speedMult));
}

// قالب‌بندی مدت زمان به فارسی
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "آماده";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ساعت`);
  if (m > 0) parts.push(`${m} دقیقه`);
  if (s > 0 && h === 0) parts.push(`${s} ثانیه`);
  return parts.join(" و ") || "آماده";
}

// محاسبه قدرت بازیکن
export function computePower(
  buildings: Record<string, number>,
  troops: Record<string, number>,
  research: Record<string, number>
): number {
  let p = 0;
  for (const lvl of Object.values(buildings)) p += lvl * 25;
  for (const [k, count] of Object.entries(troops)) {
    const def = TROOPS[k as TroopKey];
    if (def) p += def.power * count;
  }
  for (const lvl of Object.values(research)) p += lvl * 100;
  return Math.floor(p);
}

// قدرت کل ارتش (مجموع قدرت نیروها)
export function armyPower(troops: Record<string, number>): number {
  let p = 0;
  for (const [k, count] of Object.entries(troops)) {
    const def = TROOPS[k as TroopKey];
    if (def) p += def.power * count;
  }
  return p;
}

// ===== سیستم XP و سطح =====
// XP لازم برای رسیدن به سطح بعدی
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

// محاسبه سطح و XP باقیمانده بر اساس XP کل
export function levelFromXp(totalXp: number): {
  level: number;
  current: number; // xp داخل سطح فعلی
  needed: number; // xp لازم برای سطح بعد
} {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
    if (level > 200) break;
  }
  return { level, current: remaining, needed: xpForLevel(level) };
}

// مقدار XP هر اکشن
export const XP_REWARDS = {
  build: 30,
  upgrade: 25,
  research: 40,
  train: 5, // به ازای هر نیرو
  attackWin: 60,
  attackLoss: 20,
  mission: 50,
};
