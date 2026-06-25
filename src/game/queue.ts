import { db } from "@/db";
import { players, buildQueue, trainQueue } from "@/db/schema";
import { eq, and, lte, asc } from "drizzle-orm";
import { computePower, levelFromXp, XP_REWARDS, type TroopKey } from "./config";

// پردازش صف‌های ساخت و آموزش بازیکن: کارهای تمام‌شده را اعمال می‌کند
export async function processQueues(playerId: number) {
  const now = new Date();

  // --- صف ساخت/ارتقا ---
  const doneBuilds = await db
    .select()
    .from(buildQueue)
    .where(and(eq(buildQueue.playerId, playerId), lte(buildQueue.finishAt, now)))
    .orderBy(asc(buildQueue.finishAt));

  // --- صف آموزش ---
  const doneTrains = await db
    .select()
    .from(trainQueue)
    .where(and(eq(trainQueue.playerId, playerId), lte(trainQueue.finishAt, now)))
    .orderBy(asc(trainQueue.finishAt));

  if (doneBuilds.length === 0 && doneTrains.length === 0) return;

  const found = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);
  if (!found.length) return;
  const p = found[0];

  const buildings = { ...p.buildings };
  const troops = { ...p.troops };
  let xp = p.xp;
  let level = p.level;

  for (const b of doneBuilds) {
    // فقط اگر سطح هدف منطقی باشد اعمال کن
    const cur = buildings[b.building] ?? 0;
    if (b.toLevel === cur + 1) {
      buildings[b.building] = b.toLevel;
      xp += cur === 0 ? XP_REWARDS.build : XP_REWARDS.upgrade;
      if (b.building === "command") {
        level = Math.max(level, b.toLevel);
      }
    }
  }

  for (const t of doneTrains) {
    troops[t.troop] = (troops[t.troop] ?? 0) + t.quantity;
    xp += XP_REWARDS.train * t.quantity;
  }

  const levelByXp = levelFromXp(xp).level;
  level = Math.max(level, levelByXp);
  const power = computePower(buildings, troops, p.research);

  await db
    .update(players)
    .set({ buildings, troops, xp, level, power })
    .where(eq(players.id, playerId));

  // حذف کارهای تمام‌شده
  if (doneBuilds.length) {
    for (const b of doneBuilds) {
      await db.delete(buildQueue).where(eq(buildQueue.id, b.id));
    }
  }
  if (doneTrains.length) {
    for (const t of doneTrains) {
      await db.delete(trainQueue).where(eq(trainQueue.id, t.id));
    }
  }
}

// دریافت صف‌های فعال (در حال انجام) برای نمایش به کاربر
export async function getActiveQueues(playerId: number) {
  const builds = await db
    .select()
    .from(buildQueue)
    .where(eq(buildQueue.playerId, playerId))
    .orderBy(asc(buildQueue.finishAt));
  const trains = await db
    .select()
    .from(trainQueue)
    .where(eq(trainQueue.playerId, playerId))
    .orderBy(asc(trainQueue.finishAt));
  return { builds, trains };
}

// تعداد کارهای فعال ساخت
export async function countActiveBuilds(playerId: number) {
  const rows = await db
    .select()
    .from(buildQueue)
    .where(eq(buildQueue.playerId, playerId));
  return rows.length;
}

export async function countActiveTrains(playerId: number) {
  const rows = await db
    .select()
    .from(trainQueue)
    .where(eq(trainQueue.playerId, playerId));
  return rows.length;
}

export type TroopKeyExport = TroopKey;
