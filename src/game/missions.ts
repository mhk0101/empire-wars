import { db } from "@/db";
import { playerMissions, players } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { levelFromXp } from "./config";

export interface MissionDef {
  id: string;
  kind: "daily" | "weekly";
  title: string;
  target: number;
  reward: { gold?: number; gems?: number };
}

// مأموریت‌های روزانه
export const DAILY: MissionDef[] = [
  { id: "d_login", kind: "daily", title: "ورود روزانه", target: 1, reward: { gold: 200 } },
  { id: "d_upgrade", kind: "daily", title: "۲ ارتقای ساختمان", target: 2, reward: { gold: 400 } },
  { id: "d_train", kind: "daily", title: "۱۰ نیرو آموزش بده", target: 10, reward: { gold: 300, gems: 3 } },
  { id: "d_attack", kind: "daily", title: "۳ حمله انجام بده", target: 3, reward: { gold: 500, gems: 5 } },
];

// مأموریت‌های هفتگی
export const WEEKLY: MissionDef[] = [
  { id: "w_attack", kind: "weekly", title: "۲۰ حمله انجام بده", target: 20, reward: { gems: 50 } },
  { id: "w_upgrade", kind: "weekly", title: "۱۰ ارتقای ساختمان", target: 10, reward: { gems: 40 } },
  { id: "w_invite", kind: "weekly", title: "۵ دعوت موفق", target: 5, reward: { gems: 80 } },
];

export const ALL_MISSIONS = [...DAILY, ...WEEKLY];

// کلید دوره: روزانه = تاریخ امروز، هفتگی = شماره هفته
export function periodKey(kind: "daily" | "weekly", now = new Date()): string {
  if (kind === "daily") return now.toISOString().slice(0, 10);
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - oneJan.getTime()) / 86_400_000 + oneJan.getDay() + 1) / 7
  );
  return `${now.getFullYear()}-W${week}`;
}

// نگاشت اکشن‌ها به مأموریت‌ها
const ACTION_TO_MISSIONS: Record<string, string[]> = {
  login: ["d_login"],
  upgrade: ["d_upgrade", "w_upgrade"],
  train: ["d_train"],
  attack: ["d_attack", "w_attack"],
  invite: ["w_invite"],
};

// افزایش پیشرفت مأموریت‌های مرتبط با یک اکشن
export async function trackMission(
  playerId: number,
  action: string,
  amount = 1
) {
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
      .where(
        and(
          eq(playerMissions.playerId, playerId),
          eq(playerMissions.missionId, mid),
          eq(playerMissions.periodKey, pk)
        )
      )
      .limit(1);

    if (existing.length) {
      const cur = existing[0];
      if (cur.claimed) continue;
      const next = Math.min(def.target, cur.progress + amount);
      await db
        .update(playerMissions)
        .set({ progress: next })
        .where(eq(playerMissions.id, cur.id));
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

// وضعیت همه مأموریت‌های جاری بازیکن
export async function getMissionStatus(playerId: number) {
  const now = new Date();
  const rows = await db
    .select()
    .from(playerMissions)
    .where(eq(playerMissions.playerId, playerId));

  function build(def: MissionDef) {
    const pk = periodKey(def.kind, now);
    const row = rows.find(
      (r) => r.missionId === def.id && r.periodKey === pk
    );
    return {
      id: def.id,
      kind: def.kind,
      title: def.title,
      target: def.target,
      reward: def.reward,
      progress: row?.progress ?? 0,
      claimed: row?.claimed ?? false,
      done: (row?.progress ?? 0) >= def.target,
    };
  }

  return {
    daily: DAILY.map(build),
    weekly: WEEKLY.map(build),
  };
}

// دریافت جایزه مأموریت تکمیل‌شده
export async function claimMission(playerId: number, missionId: string) {
  const def = ALL_MISSIONS.find((m) => m.id === missionId);
  if (!def) return { error: "مأموریت نامعتبر است." };
  const now = new Date();
  const pk = periodKey(def.kind, now);

  const existing = await db
    .select()
    .from(playerMissions)
    .where(
      and(
        eq(playerMissions.playerId, playerId),
        eq(playerMissions.missionId, missionId),
        eq(playerMissions.periodKey, pk)
      )
    )
    .limit(1);

  if (!existing.length || existing[0].progress < def.target) {
    return { error: "این مأموریت هنوز کامل نشده." };
  }
  if (existing[0].claimed) {
    return { error: "جایزه قبلاً دریافت شده." };
  }

  const pl = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  if (!pl.length) return { error: "بازیکن پیدا نشد." };
  const p = pl[0];

  const newGold = p.gold + (def.reward.gold ?? 0);
  const newGems = p.gems + (def.reward.gems ?? 0);
  const newXp = p.xp + 50;
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

  await db
    .update(playerMissions)
    .set({ claimed: true })
    .where(eq(playerMissions.id, existing[0].id));

  return { reward: def.reward };
}
