import { getSettings } from "@/game/settings";
import { db } from "@/db";
import { players, announcements } from "@/db/schema";
import { sendMessage } from "@/game/telegram";
import { eq, isNotNull, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ارسال پیام همگانی به تمام کاربرانی که ربات را استارت کرده‌اند
export async function POST(req: Request) {
  // رمز ادمین غیرفعال شد
  // const s = await getSettings();
  // if (req.headers.get("x-admin-pass") !== s.adminPassword) {
  //   return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  // }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();

  if (!title || !message) {
    return Response.json({ error: "عنوان و متن پیام الزامی است." }, { status: 400 });
  }

  // ۱. ثبت در جدول اطلاعیه‌ها (برای نمایش داخل بازی)
  await db.insert(announcements).values({ title, message });

  // ۱.۵. ارسال Notification داخل بازی (به همه)
  await db.execute(sql`
    INSERT INTO notifications (player_id, title, message, type, icon)
    VALUES (NULL, ${title}, ${message}, 'admin', '📢')
  `);

  // ۲. ارسال به تلگرام (فقط کاربرانی که telegramId دارند)
  const allPlayers = await db
    .select({ telegramId: players.telegramId })
    .from(players)
    .where(isNotNull(players.telegramId));

  let successCount = 0;
  // ارسال تکی (برای مقیاس خیلی بالا باید از Queue استفاده شود، فعلاً ساده ارسال می‌کنیم)
  for (const p of allPlayers) {
    if (p.telegramId) {
      try {
        await sendMessage(p.telegramId, `📢 <b>${title}</b>\n\n${message}`);
        successCount++;
      } catch (e) {
        console.error(`Failed to send to ${p.telegramId}`, e);
      }
    }
  }

  return Response.json({ ok: true, sentCount: successCount });
}
