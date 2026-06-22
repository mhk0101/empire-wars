import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { productionRates, type PlayerLike } from "@/game/logic";
import { warehouseCapacity, levelFromXp, armyPower } from "@/game/config";
import { processQueues, getActiveQueues } from "@/game/queue";
import { trackMission } from "@/game/missions";
import { db } from "@/db";
import { clans, players } from "@/db/schema";
import { eq, gt, sql, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const base = await getOrCreatePlayer();
  // کاربر مسدودشده اجازه ورود ندارد
  if (base.banned) {
    return Response.json(
      { error: "حساب شما توسط مدیر مسدود شده است.", banned: true },
      { status: 403 }
    );
  }
  // ابتدا کارهای تمام‌شده‌ی صف را اعمال کن (تایمرها)
  await processQueues(base.id);
  await trackMission(base.id, "login", 1);
  const player = (await syncPlayer(base.id)) ?? base;

  const rates = productionRates(player as unknown as PlayerLike);
  const capacity = warehouseCapacity(player.buildings.warehouse ?? 0);

  let clan = null;
  if (player.clanId) {
    const c = await db
      .select()
      .from(clans)
      .where(eq(clans.id, player.clanId))
      .limit(1);
    clan = c[0] ?? null;
  }

  // محاسبه رتبه بازیکن بر اساس قدرت
  const rankRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(players)
    .where(gt(players.power, player.power));
  const rank = (rankRow[0]?.count ?? 0) + 1;

  const xpInfo = levelFromXp(player.xp ?? 0);
  const army = armyPower(player.troops);
  const queues = await getActiveQueues(player.id);

  // آمار زنده سرور
  const totalPlayers = (await db.select({ c: count() }).from(players))[0].c;
  const totalClans = (await db.select({ c: count() }).from(clans))[0].c;
  // بازیکنان فعال در ۱۵ دقیقه اخیر = «آنلاین»
  const onlineRow = await db
    .select({ c: count() })
    .from(players)
    .where(gt(players.lastCollect, new Date(Date.now() - 15 * 60_000)));
  const online = onlineRow[0].c;

  return Response.json({
    player,
    rates,
    capacity,
    clan,
    rank,
    xp: xpInfo,
    army,
    queues,
    server: { online, players: totalPlayers, clans: totalClans },
    now: new Date().toISOString(),
  });
}
