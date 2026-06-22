import { db } from "@/db";
import { players } from "@/db/schema";
import { eq, gt, sql } from "drizzle-orm";
import {
  getOrCreatePlayerByTelegram,
  syncPlayer,
} from "@/game/session";
import {
  sendMessage,
  answerCallback,
  mainMenu,
  gameUrl,
  botEnabled,
} from "@/game/telegram";
import { DAILY_REWARDS } from "@/game/config";

export const dynamic = "force-dynamic";

function fa(n: number) {
  return n.toLocaleString("fa-IR");
}

// تلگرام این مسیر را به‌عنوان webhook صدا می‌زند
export async function POST(req: Request) {
  // بررسی توکن مخفی webhook (امنیت)
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== secret) {
      return new Response("forbidden", { status: 403 });
    }
  }

  if (!botEnabled()) {
    return Response.json({ ok: false, error: "bot token not set" });
  }

  const update = await req.json().catch(() => null);
  if (!update) return Response.json({ ok: true });

  try {
    // پیام متنی (مثل /start)
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const from = msg.from;
      const text: string = msg.text || "";
      const name = [from.first_name, from.last_name].filter(Boolean).join(" ");

      const player = await getOrCreatePlayerByTelegram(String(from.id), name);

      if (text.startsWith("/start")) {
        await sendMessage(
          chatId,
          `👑 <b>به Empire Wars خوش آمدی، ${player.username}!</b>\n\n` +
            `امپراتوری خود را بساز، منابع جمع کن و قدرتمندترین فرمانده سرور شو.\n\n` +
            `از دکمه‌های زیر استفاده کن:`,
          mainMenu()
        );
      } else {
        await sendMessage(chatId, "از منوی زیر انتخاب کن:", mainMenu());
      }
      return Response.json({ ok: true });
    }

    // دکمه‌های شیشه‌ای (callback)
    if (update.callback_query) {
      const cq = update.callback_query;
      const data: string = cq.data || "";
      const chatId = cq.message.chat.id;
      const from = cq.from;
      const name = [from.first_name, from.last_name].filter(Boolean).join(" ");
      const base = await getOrCreatePlayerByTelegram(String(from.id), name);
      const player = (await syncPlayer(base.id)) ?? base;

      if (data === "res") {
        await answerCallback(cq.id);
        await sendMessage(
          chatId,
          `💰 <b>منابع ${player.username}</b>\n\n` +
            `💰 طلا: ${fa(Math.floor(player.gold))}\n` +
            `🌾 غذا: ${fa(Math.floor(player.food))}\n` +
            `⛏️ سنگ: ${fa(Math.floor(player.stone))}\n` +
            `⚙️ آهن: ${fa(Math.floor(player.iron))}\n` +
            `💎 جم: ${fa(player.gems)}\n\n` +
            `⚡ قدرت: ${fa(player.power)} • سطح ${fa(player.level)}`
        );
      } else if (data === "rank") {
        await answerCallback(cq.id);
        const rankRow = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(players)
          .where(gt(players.power, player.power));
        const rank = (rankRow[0]?.count ?? 0) + 1;
        await sendMessage(
          chatId,
          `🏆 <b>رتبه شما</b>\n\nرتبه: <b>#${fa(rank)}</b>\nقدرت: ${fa(
            player.power
          )}\nسطح: ${fa(player.level)}`
        );
      } else if (data === "daily") {
        await answerCallback(cq.id);
        const now = new Date();
        const claimedToday =
          player.lastDailyClaim &&
          new Date(player.lastDailyClaim).toDateString() === now.toDateString();
        if (claimedToday) {
          await sendMessage(chatId, "🎁 پاداش امروز را قبلاً گرفته‌ای. فردا برگرد!");
        } else {
          let streak = player.dailyStreak;
          if (player.lastDailyClaim) {
            const diff = Math.floor(
              (now.getTime() - new Date(player.lastDailyClaim).getTime()) /
                86_400_000
            );
            streak = diff === 1 ? streak + 1 : 1;
          } else streak = 1;
          const dayIndex = ((streak - 1) % 7) + 1;
          const reward = DAILY_REWARDS.find((r) => r.day === dayIndex)!;
          await db
            .update(players)
            .set({
              gold: player.gold + reward.gold,
              gems: player.gems + reward.gems,
              dailyStreak: streak,
              lastDailyClaim: now,
              totalGoldEarned: player.totalGoldEarned + reward.gold,
            })
            .where(eq(players.id, player.id));
          await sendMessage(
            chatId,
            `🎁 <b>پاداش روز ${fa(dayIndex)}</b>\n\n` +
              (reward.gold ? `+${fa(reward.gold)} 💰 طلا\n` : "") +
              (reward.gems ? `+${fa(reward.gems)} 💎 جم\n` : "") +
              `\nهر روز برگرد تا پاداش بیشتری بگیری!`
          );
        }
      } else if (data === "invite") {
        await answerCallback(cq.id);
        const url = gameUrl();
        const link = url
          ? `${url}/game?ref=${player.inviteCode}`
          : `کد دعوت: ${player.inviteCode}`;
        await sendMessage(
          chatId,
          `⚔️ <b>دعوت از متحدین جدید</b>\n\n` +
            `فرمانده، ارتش خود را با دعوت از دوستانتان بزرگتر کنید!\n\n` +
            `🔹 کد اختصاصی شما: <code>${player.inviteCode}</code>\n` +
            `🔹 تعداد دعوت‌های شما: <b>${fa(player.inviteCount)}</b>\n\n` +
            `🎁 <b>پاداش:</b> به ازای هر دعوت موفق، ۵۰۰ طلا و ۲۰ جم دریافت کنید.\n\n` +
            `🔗 <b>لینک ورود مستقیم دوستان شما:</b>\n${link}`
        );
      } else if (data === "no_url") {
        await answerCallback(cq.id, "آدرس بازی هنوز تنظیم نشده است.");
      } else {
        await answerCallback(cq.id);
      }
      return Response.json({ ok: true });
    }
  } catch {
    // خطاها را بی‌صدا رد کن تا تلگرام دوباره ارسال نکند
  }

  return Response.json({ ok: true });
}

// برای تست در مرورگر
export async function GET() {
  return Response.json({
    ok: true,
    bot: botEnabled() ? "فعال" : "توکن تنظیم نشده",
    gameUrl: gameUrl() || "تنظیم نشده",
  });
}
