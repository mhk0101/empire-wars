import { getSettings } from "@/game/settings";
import { db } from "@/db";
import { players, activityLog } from "@/db/schema";
import { sendMessage } from "@/game/telegram";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ارسال پیام خصوصی به یک کاربر خاص (از طریق activityLog + تلگرام)
export async function POST(req: Request) {
  const s = await getSettings();
  if (req.headers.get("x-admin-pass") !== s.adminPassword) {
    return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const playerId = Number(body.playerId);
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();

  if (!playerId || !title || !message) {
    return Response.json({ error: "شناسه کاربر، عنوان و متن پیام الزامی است." }, { status: 400 });
  }

  const pl = await db
    .select()
    .from(players)
    .where(eq(players.id, playerId))
    .limit(1);

  if (!pl.length) {
    return Response.json({ error: "کاربر یافت نشد." }, { status: 404 });
  }

  // ثبت در activityLog
  await db.insert(activityLog).values({
    playerId,
    icon: "📢",
    text: `${title}: ${message}`,
  });

  // ارسال به تلگرام
  let telegramSent = false;
  if (pl[0].telegramId) {
    try {
      await sendMessage(pl[0].telegramId, `📩 <b>پیام خصوصی از ادمین</b>\n\n<b>${title}</b>\n${message}`);
      telegramSent = true;
    } catch (e) {
      console.error(`Failed to send DM to ${pl[0].telegramId}`, e);
    }
  }

  return Response.json({ ok: true, telegramSent });
}
