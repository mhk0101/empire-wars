// ===== کش آمار سرور =====
// آمار سرور (تعداد کاربران، کلن‌ها، آنلاین‌ها) با هر بار لود بازی محاسبه می‌شد
// که ۳ کوئری سنگین بود. حالا کش می‌شود و فقط هر ۶۰ ثانیه آپدیت می‌شود.

import { db } from "@/db";
import { players, clans } from "@/db/schema";
import { count, gt } from "drizzle-orm";

interface ServerStats {
  online: number;
  players: number;
  clans: number;
}

let cache: ServerStats | null = null;
let cacheTime = 0;
const TTL = 60_000; // ۶۰ ثانیه کش

export async function getServerStats(): Promise<ServerStats> {
  const now = Date.now();

  // اگر کش معتبر است، از کش استفاده کن
  if (cache && now - cacheTime < TTL) {
    return cache;
  }

  // کوئری‌ها را به‌صورت موازی اجرا کن (سریع‌تر)
  const [totalPlayers, totalClans, onlineRow] = await Promise.all([
    db.select({ c: count() }).from(players),
    db.select({ c: count() }).from(clans),
    db
      .select({ c: count() })
      .from(players)
      .where(gt(players.lastCollect, new Date(now - 15 * 60_000))),
  ]);

  cache = {
    players: totalPlayers[0].c,
    clans: totalClans[0].c,
    online: onlineRow[0].c,
  };
  cacheTime = now;

  return cache;
}
