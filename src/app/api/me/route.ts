import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { productionRates, type PlayerLike } from "@/game/logic";
import { warehouseCapacity, levelFromXp, armyPower } from "@/game/config";
import { processQueues, getActiveQueues } from "@/game/queue";
import { trackMission } from "@/game/missions";
import { getServerStats } from "@/game/serverStats";
import { db } from "@/db";
import { ensureSchema } from "@/db/init";
import { clans, players } from "@/db/schema";
import { eq, gt, sql } from "drizzle-orm";
import { trackSession } from "@/game/sessions";
import { getClientIp } from "@/game/rateLimit";

export const dynamic = "force-dynamic";

// کش سبک برای رتبه‌ی بازیکن (هر ۳۰ ثانیه آپدیت)
const rankCache = new Map<number, { rank: number; at: number }>();

export async function GET() {
  // اطمینان از وجود جدول‌ها پیش از هر کوئری
  await ensureSchema();
  let base;
  try {
    base = await getOrCreatePlayer();
  } catch (e) {
    // خطای محدودیت ساخت اکانت (rate limit)
    const err = e as Error & { rateLimited?: boolean };
    if (err.rateLimited) {
      return Response.json(
        { error: err.message, rateLimited: true },
        { status: 429 }
      );
    }
    console.error("getOrCreatePlayer error:", (e as Error)?.message);
    return Response.json({ error: "خطا در بارگذاری بازی." }, { status: 500 });
  }
  // کاربر مسدودشده اجازه ورود ندارد
  if (base.banned) {
    return Response.json(
      { error: "حساب شما توسط مدیر مسدود شده است.", banned: true },
      { status: 403 }
    );
  }
  // ابتدا کارهای تمام‌شده‌ی صف را اعمال کن (تایمرها)
  await processQueues(base.id);
  const player = (await syncPlayer(base.id)) ?? base;

  // ثبت جلسه‌ی ورود — به‌صورت ناهمزامن و با throttle (هر ۶۰ ثانیه)
  // این کار را با fire-and-forget اجرا می‌کنیم تا سرعت پاسخ بالا برود
  void (async () => {
    try {
      const ip = await getClientIp();
      await trackSession(player.id, player.username, ip);
    } catch {
      // بی‌صدا
    }
  })();

  // مأموریت ورود — فقط روزانه یک‌بار ثبت شود (نه با هر رفرش)
  void trackMission(base.id, "login", 1).catch(() => {});

  const rates = productionRates(player as unknown as PlayerLike);
  const capacity = warehouseCapacity(player.buildings.warehouse ?? 0);

  // کلن و صف‌ها را موازی بگیر (سریع‌تر)
  const [clanData, queues] = await Promise.all([
    player.clanId
      ? db.select().from(clans).where(eq(clans.id, player.clanId)).limit(1)
      : Promise.resolve([]),
    getActiveQueues(player.id),
  ]);
  const clan = clanData[0] ?? null;

  // رتبه‌ی بازیکن — با کش ۳۰ ثانیه‌ای (جلوگیری از count(*) با هر رفرش)
  let rank: number;
  const cached = rankCache.get(player.id);
  if (cached && Date.now() - cached.at < 30_000) {
    rank = cached.rank;
  } else {
    const rankRow = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(players)
      .where(gt(players.power, player.power));
    rank = (rankRow[0]?.count ?? 0) + 1;
    rankCache.set(player.id, { rank, at: Date.now() });
  }

  const xpInfo = levelFromXp(player.xp ?? 0);
  const army = armyPower(player.troops);

  // آمار سرور از کش (هر ۶۰ ثانیه آپدیت می‌شود)
  const server = await getServerStats();

  return Response.json({
    player,
    rates,
    capacity,
    clan,
    rank,
    xp: xpInfo,
    army,
    queues,
    server,
    now: new Date().toISOString(),
  });
}
