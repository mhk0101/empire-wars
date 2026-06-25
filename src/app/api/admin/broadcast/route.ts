import { getSettings } from "@/game/settings";
import { db } from "@/db";
import { players, announcements } from "@/db/schema";
import { sendMessage } from "@/game/telegram";
import { eq, isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const s = await getSettings();
  if (req.headers.get("x-admin-pass") !== s.adminPassword) {
    return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, message, targetPlayerId, sendToTelegram } = body;

  if (!title || !message) {
    return Response.json({ error: "عنوان و متن الزامی است." }, { status: 400 });
  }

  // ۱. ثبت در اطلاعیه‌ها
  await db.insert(announcements).values({ title, message });

  // ۲. ارسال
  let sentCount = 0;
  if (targetPlayerId) {
    // ارسال به یک کاربر خاص
    const p = await db.select().from(players).where(eq(players.id, Number(targetPlayerId))).limit(1);
    if (p.length && p[0].telegramId && sendToTelegram) {
      await sendMessage(p[0].telegramId, `🔔 <b>${title}</b>\n\n${message}`);
      sentCount = 1;
    }
  } else {
    // ارسال همگانی
    if (sendToTelegram) {
      const all = await db.select({ tid: players.telegramId }).from(players).where(isNotNull(players.telegramId));
      for (const p of all) {
        if (p.tid) {
          try { await sendMessage(p.tid, `📢 <b>${title}</b>\n\n${message}`); sentCount++; } catch {}
        }
      }
    }
  }

  return Response.json({ ok: true, sentCount });
}
