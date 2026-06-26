import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendMessage } from "@/game/telegram";
import { isSameDay } from "@/game/config";

export const dynamic = "force-dynamic";

// هنگامی که جایزه‌ی روزانه آماده دریافت است، یک‌بار در روز به کاربر اطلاع بده.
// این مسیر فقط توسط پاپ‌آپ داخل بازی صدا زده می‌شود و یک پیام تلگرام می‌فرستد.
export async function POST() {
  const player = await getOrCreatePlayer();
  const now = new Date();

  // آیا جایزه‌ی امروز آماده است؟
  const ready =
    !player.lastDailyClaim || !isSameDay(new Date(player.lastDailyClaim), now);

  if (!ready) {
    return Response.json({ ok: true, ready: false, reason: "already_claimed" });
  }

  // آیا امروز قبلاً اطلاع‌رسانی کرده‌ایم؟ (با استفاده از lastDailyLoginDate)
  const todayKey = now.toISOString().slice(0, 10);
  if (player.lastDailyLoginDate === todayKey) {
    return Response.json({ ok: true, ready: true, notified: false, reason: "already_notified" });
  }

  // ثبت اینکه امروز اطلاع دادیم
  await db
    .update(players)
    .set({ lastDailyLoginDate: todayKey })
    .where(eq(players.id, player.id));

  // ارسال پیام تلگرام (اگر کاربر به ربات متصل است)
  let telegramSent = false;
  if (player.telegramId) {
    try {
      await sendMessage(
        player.telegramId,
        `🎁 <b>جایزه‌ی روزانه‌ات آماده است!</b>\n\nسلام فرمانده! جایزه‌ی ورود امروز رو هنوز نگرفتی. هر روز که بیای و بگیری، جایزه‌ت بیشتر می‌شه. تا ۷ روز پشت سر هم که بیای، جایزه‌ی ویژه‌ی جم هم برات هست! 💎\n\n🎮 همین حالا وارد بازی شو و جایزه‌ات رو دریافت کن.`
      );
      telegramSent = true;
    } catch (e) {
      console.error("Failed to send daily-ready telegram", e);
    }
  }

  return Response.json({ ok: true, ready: true, notified: true, telegramSent });
}
