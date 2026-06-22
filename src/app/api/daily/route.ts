import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { DAILY_REWARDS } from "@/game/config";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/game/activity";

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

  // محاسبه streak
  let streak = player.dailyStreak;
  if (player.lastDailyClaim) {
    const last = new Date(player.lastDailyClaim);
    const diffDays = Math.floor(
      (now.getTime() - last.getTime()) / 86_400_000
    );
    streak = diffDays === 1 ? streak + 1 : 1;
  } else {
    streak = 1;
  }
  const dayIndex = ((streak - 1) % 7) + 1;
  const reward = DAILY_REWARDS.find((r) => r.day === dayIndex)!;

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
