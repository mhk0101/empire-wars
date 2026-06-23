// ===== ابزارهای ربات تلگرام =====

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : "";

// آدرس وب‌اپ بازی (برای دکمه ورود به بازی)
export function gameUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ""
  ).replace(/\/$/, "");
}

export function botEnabled() {
  return !!TOKEN;
}

// ارسال پیام تلگرام
export async function sendMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: object
) {
  if (!API || !chatId) return;
  await fetch(`${API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    }),
  }).catch(() => {});
}

// ارسال اعلان خودکار
export async function sendNotification(playerId: number, text: string) {
  try {
    const { db } = await import("@/db");
    const { players } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    
    const user = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
    if (user.length && user[0].telegramId) {
      await sendMessage(user[0].telegramId, text);
    }
  } catch (e) {
    console.error("Failed to send telegram notification", e);
  }
}

// پاسخ به callback (دکمه‌های شیشه‌ای)
export async function answerCallback(callbackId: string, text?: string) {
  if (!API) return;
  await fetch(`${API}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  }).catch(() => {});
}

// منوی اصلی ربات (دکمه‌های inline)
export function mainMenu() {
  const url = gameUrl();
  const playRow = url
    ? [[{ text: "🎮 ورود به بازی", web_app: { url: `${url}/game` } }]]
    : [[{ text: "🎮 ورود به بازی", callback_data: "no_url" }]];
  return {
    inline_keyboard: [
      ...playRow,
      [
        { text: "🎁 جایزه روزانه", callback_data: "daily" },
        { text: "🏆 رتبه من", callback_data: "rank" },
      ],
      [
        { text: "💰 منابع من", callback_data: "res" },
        { text: "👥 دعوت دوستان", callback_data: "invite" },
      ],
    ],
  };
}
