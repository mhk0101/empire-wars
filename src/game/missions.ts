import { db } from "@/db";
import { playerMissions, players } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { levelFromXp } from "./config";

// گروه‌های مأموریت و دستاورد
export interface MissionDef {
  id: string;
  kind: "daily" | "weekly" | "seasonal" | "achievement";
  category: "economy" | "military" | "social" | "clan";
  title: string;
  target: number;
  reward: { gold?: number; gems?: number; xp?: number };
}

export const DAILY: MissionDef[] = [
  { id: "d_login", kind: "daily", category: "social", title: "ورود روزانه", target: 1, reward: { gold: 200, xp: 10 } },
  { id: "d_upgrade", kind: "daily", category: "economy", title: "ارتقای ساختمان", target: 1, reward: { gold: 400, xp: 20 } },
  { id: "d_attack", kind: "daily", category: "military", title: "حمله به دشمن", target: 1, reward: { gold: 500, gems: 2, xp: 30 } },
];

export const WEEKLY: MissionDef[] = [
  { id: "w_attack", kind: "weekly", category: "military", title: "۲۰ حمله موفق", target: 20, reward: { gems: 50, xp: 200 } },
  { id: "w_invite", kind: "weekly", category: "social", title: "۵ دعوت موفق", target: 5, reward: { gems: 80, xp: 150 } },
];

export const ACHIEVEMENTS: MissionDef[] = [
  { id: "a_gold_1k", kind: "achievement", category: "economy", title: "جمع‌آوری ۱,۰۰۰ طلا", target: 1000, reward: { gems: 10 } },
  { id: "a_gold_10k", kind: "achievement", category: "economy", title: "جمع‌آوری ۱۰,۰۰۰ طلا", target: 10000, reward: { gems: 50 } },
  { id: "a_atk_1", kind: "achievement", category: "military", title: "اولین پیروزی", target: 1, reward: { gems: 5 } },
  { id: "a_atk_100", kind: "achievement", category: "military", title: "۱۰۰ پیروزی در نبرد", target: 100, reward: { gems: 200 } },
  { id: "a_inv_5", kind: "achievement", category: "social", title: "۵ دعوت موفق", target: 5, reward: { gems: 50 } },
];

export const ALL_MISSIONS = [...DAILY, ...WEEKLY, ...ACHIEVEMENTS];

// کلید دوره: روزانه = تاریخ امروز، هفتگی = شماره هفته، دستاورد = ثابت
export function periodKey(kind: string, now = new Date()): string {
  if (kind === "daily") return now.toISOString().slice(0, 10);
  if (kind === "weekly") {
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - oneJan.getTime()) / 86_400_000 + oneJan.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
  }
  return "fixed";
}

// نگاشت اکشن‌ها به مأموریت‌ها
const ACTION_TO_MISSIONS: Record<string, string[]> = {
  login: ["d_login"],
  upgrade: ["d_upgrade", "w_upgrade"],
  train: ["d_train"],
  attack: ["d_attack", "w_attack", "a_atk_1", "a_atk_100"],
  invite: ["w_invite", "a_inv_5"],
};

export async function trackMission(playerId: number, action: string, amount = 1) {
  const missionIds = ACTION_TO_MISSIONS[action];
  if (!missionIds) return;
  const now = new Date();

  for (const mid of missionIds) {
    const def = ALL_MISSIONS.find((m) => m.id === mid);
    if (!def) continue;
    const pk = periodKey(def.kind, now);

    const existing = await db
      .select()
      .from(playerMissions)
      .where(and(eq(playerMissions.playerId, playerId), eq(playerMissions.missionId, mid), eq(playerMissions.periodKey, pk)))
      .limit(1);

    if (existing.length) {
      const cur = existing[0];
      if (cur.claimed) continue;
      const next = Math.min(def.target, cur.progress + amount);
      await db.update(playerMissions).set({ progress: next }).where(eq(playerMissions.id, cur.id));
    } else {
      await db.insert(playerMissions).values({
        playerId,
        missionId: mid,
        kind: def.kind,
        progress: Math.min(def.target, amount),
        periodKey: pk,
        claimed: false,
      });
    }
  }
}

export async function getMissionStatus(playerId: number) {
  const now = new Date();
  const rows = await db.select().from(playerMissions).where(eq(playerMissions.playerId, playerId));

  const build = (def: MissionDef) => {
    const pk = periodKey(def.kind, now);
    const row = rows.find((r) => r.missionId === def.id && r.periodKey === pk);
    return {
      ...def,
      progress: row?.progress ?? 0,
      claimed: row?.claimed ?? false,
      done: (row?.progress ?? 0) >= def.target,
    };
  };

  return {
    daily: DAILY.map(build),
    weekly: WEEKLY.map(build),
    achievements: ACHIEVEMENTS.map(build),
  };
}

export async function claimMission(playerId: number, missionId: string) {
  const def = ALL_MISSIONS.find((m) => m.id === missionId);
  if (!def) return { error: "مأموریت نامعتبر" };
  const now = new Date();
  const pk = periodKey(def.kind, now);

  const existing = await db
    .select()
    .from(playerMissions)
    .where(and(eq(playerMissions.playerId, playerId), eq(playerMissions.missionId, missionId), eq(playerMissions.periodKey, pk)))
    .limit(1);

  if (!existing.length || existing[0].progress < def.target) return { error: "تکمیل نشده" };
  if (existing[0].claimed) return { error: "قبلاً دریافت شده" };

  const pl = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
  if (!pl.length) return { error: "بازیکن یافت نشد" };
  const p = pl[0];

  const newGold = p.gold + (def.reward.gold ?? 0);
  const newGems = p.gems + (def.reward.gems ?? 0);
  const newXp = p.xp + (def.reward.xp ?? 50);

  await db
    .update(players)
    .set({
      gold: newGold,
      gems: newGems,
      xp: newXp,
      level: Math.max(p.level, levelFromXp(newXp).level),
      totalGoldEarned: p.totalGoldEarned + (def.reward.gold ?? 0),
    })
    .where(eq(players.id, playerId));

  await db.update(playerMissions).set({ claimed: true }).where(eq(playerMissions.id, existing[0].id));
  return { reward: def.reward };
}
