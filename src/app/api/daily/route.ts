import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/game/activity";
import { getSettings } from "@/game/settings";

export const dynamic = "force-dynamic";

export async function POST() {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const now = new Date();

  if (player.lastDailyClaim) {
    const last = new Date(player.lastDailyClaim);
    const sameDay =
      last.toDateString() === now.toDateString();
    if (sameDay) {
      return Response.json(
        { error: "پاداش امروز را قبلاً دریافت کرده‌اید." },
        { status: 400 }
      );
    }
  }

  // محاسبه streak دقیق و بدون باگ
  let streak = player.dailyStreak;
  const todayStr = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86_400_000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (player.lastDailyClaim) {
    const lastDateStr = new Date(player.lastDailyClaim).toISOString().slice(0, 10);
    if (lastDateStr === yesterdayStr) {
      streak = (streak % 7) + 1; // ادامه استریک تا ۷ روز
    } else {
      streak = 1; // ریست استریک اگر یک روز جا افتاده باشد
    }
  } else {
    streak = 1; // اولین بار
  }

  const dayIndex = streak;

  // پاداش روزانه از تنظیمات
  const s = await getSettings();
  const reward =
    dayIndex === 7
      ? { gold: 0, gems: Number(s.daily7Gems) || 30 }
      : { gold: Number(s[`daily${dayIndex}`]) || 0, gems: 0 };

  const updated = await db
    .update(players)
    .set({
      gold: player.gold + reward.gold,
      gems: player.gems + reward.gems,
      dailyStreak: streak,
      lastDailyClaim: now,
      totalGoldEarned: player.totalGoldEarned + reward.gold,
    })
    .where(eq(players.id, player.id))
    .returning();

  await logActivity(
    player.id,
    "🎁",
    `جایزه روز ${dayIndex} دریافت شد` +
      (reward.gold ? ` (+${reward.gold} طلا)` : ` (+${reward.gems} جم)`)
  );

  return Response.json({ player: updated[0], reward, day: dayIndex });
}
