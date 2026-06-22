import {
  PRODUCTION,
  warehouseCapacity,
  type ResourceKey,
} from "./config";

export interface PlayerLike {
  buildings: Record<string, number>;
  research: Record<string, number>;
  vipUntil: Date | null;
  boosterUntil: Date | null;
  lastCollect: Date | string;
  gold: number;
  food: number;
  stone: number;
  iron: number;
  gems: number;
}

// نرخ تولید در ساعت برای هر منبع، با اعمال ضرایب
export function productionRates(
  player: PlayerLike,
  now = new Date()
): Record<ResourceKey, number> {
  const econLevel = player.research.economy ?? 0;
  const econMult = 1 + econLevel * 0.1;
  const vip = player.vipUntil && new Date(player.vipUntil) > now ? 1.2 : 1;
  const booster =
    player.boosterUntil && new Date(player.boosterUntil) > now ? 1.5 : 1;

  const rates: Record<ResourceKey, number> = {
    gold: 0,
    food: 0,
    stone: 0,
    iron: 0,
    gems: 0,
  };

  for (const [bKey, def] of Object.entries(PRODUCTION)) {
    const lvl = player.buildings[bKey] ?? 0;
    const amount = def.base * lvl * econMult * vip * booster;
    rates[def.resource] += Math.floor(amount);
  }
  return rates;
}

// محاسبه منابع جدید بر اساس زمان سپری شده
export function collectResources(
  player: PlayerLike,
  now = new Date()
): {
  gold: number;
  food: number;
  stone: number;
  iron: number;
  gained: Record<ResourceKey, number>;
} {
  const last = new Date(player.lastCollect).getTime();
  const elapsedHours = Math.max(0, (now.getTime() - last) / 3_600_000);
  const rates = productionRates(player, now);
  const cap = warehouseCapacity(player.buildings.warehouse ?? 0);

  const gained: Record<ResourceKey, number> = {
    gold: Math.floor(rates.gold * elapsedHours),
    food: Math.floor(rates.food * elapsedHours),
    stone: Math.floor(rates.stone * elapsedHours),
    iron: Math.floor(rates.iron * elapsedHours),
    gems: 0,
  };

  const gold = Math.min(cap, player.gold + gained.gold);
  const food = Math.min(cap, player.food + gained.food);
  const stone = Math.min(cap, player.stone + gained.stone);
  const iron = Math.min(cap, player.iron + gained.iron);

  return { gold, food, stone, iron, gained };
}

// تعداد ارقام فارسی
export function toFa(n: number): string {
  return n.toLocaleString("fa-IR");
}

export function isVip(player: { vipUntil: Date | null }, now = new Date()) {
  return !!player.vipUntil && new Date(player.vipUntil) > now;
}

export function isShielded(player: { shieldUntil: Date | null }, now = new Date()) {
  return !!player.shieldUntil && new Date(player.shieldUntil) > now;
}
