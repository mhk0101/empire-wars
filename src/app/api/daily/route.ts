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

  const todayStr = now.toISOString().slice(0, 10);
  if (player.lastDailyClaim) {
    const lastStr = new Date(player.lastDailyClaim).toISOString().slice(0, 10);
    if (lastStr === todayStr) {
      return Response.json(
        { error: "پاداش امروز را قبلاً دریافت کرده‌اید. فردا دوباره سر بزن!" },
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

  // پاداش روزانه از تنظیمات (قابل تغییر از پنل ادمین)
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
