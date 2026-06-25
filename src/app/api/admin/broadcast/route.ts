import { getSettings } from "@/game/settings";
import { db } from "@/db";
import { players, announcements, notifications } from "@/db/schema";
import { sendMessage } from "@/game/telegram";
import { eq, isNotNull, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function checkAuth(req: Request): Promise<boolean> {
  const s = await getSettings();
  return req.headers.get("x-admin-pass") === s.adminPassword;
}

// دریافت آخرین اطلاعیه‌ی فعال برای نمایش داخل بازی (پاپ‌آپ همگانی)
export async function GET() {
  const last = await db
    .select()
    .from(announcements)
    .where(eq(announcements.active, true))
    .orderBy(desc(announcements.createdAt))
    .limit(1);
  if (!last.length) return Response.json({ announcement: null });
  return Response.json({
    announcement: {
      id: last[0].id,
      title: last[0].title,
      message: last[0].message,
      icon: "📢",
    },
  });
}

interface Channels {
  inApp?: boolean;
  telegram?: boolean;
}

// ارسال پیام قابل‌پیکربندی:
//   target  : "all" (همه) | "user" (یک کاربر خاص)
//   channels: { inApp: پاپ‌آپ داخل بازی, telegram: پیام تلگرام }
//   username / playerId : هنگامی که target برابر "user" است
export async function POST(req: Request) {
  if (!(await checkAuth(req))) {
    return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  const target = String(body.target || "all"); // "all" | "user"
  const username = String(body.username || "").trim();
  const playerId = body.playerId ? Number(body.playerId) : null;

  // کانال‌های ارسال — پیش‌فرض هر دو فعال
  const channels: Channels = {
    inApp: body.channels?.inApp !== false,
    telegram: body.channels?.telegram === true,
  };
  // حداقل یک کانال باید انتخاب شده باشد
  if (!channels.inApp && !channels.telegram) {
    channels.inApp = true;
  }

  if (!title || !message) {
    return Response.json(
      { error: "عنوان و متن پیام الزامی است." },
      { status: 400 }
    );
  }

  // گزارش نتیجه‌ی ارسال
  const report = {
    ok: true,
    mode: target, // "all" | "user"
    channels,
    target: "" as string,
    inAppDelivered: 0,
    telegramSent: 0,
    telegramSkipped: 0, // کاربران بدون اتصال تلگرام
  };

  // ===== حالت اختصاصی: یک کاربر خاص =====
  if (target === "user") {
    if (!username && !playerId) {
      return Response.json(
        { error: "نام کاربری یا آیدی گیرنده را وارد کنید." },
        { status: 400 }
      );
    }

    // پیدا کردن کاربر هدف
    const found = playerId
      ? await db
          .select()
          .from(players)
          .where(eq(players.id, playerId))
          .limit(1)
      : await db
          .select()
          .from(players)
          .where(eq(players.username, username))
          .limit(1);

    if (!found.length) {
      return Response.json({ error: "کاربر مورد نظر پیدا نشد." }, { status: 404 });
    }
    const targetPlayer = found[0];
    report.target = targetPlayer.username;

    // ۱) پاپ‌آپ داخل بازی (مخصوص این کاربر)
    if (channels.inApp) {
      await db.insert(notifications).values({
        playerId: targetPlayer.id,
        title,
        message,
        icon: "📨",
      });
      report.inAppDelivered = 1;
    }

    // ۲) پیام تلگرام
    if (channels.telegram) {
      if (targetPlayer.telegramId) {
        try {
          await sendMessage(
            targetPlayer.telegramId,
            `📨 <b>${title}</b>\n\n${message}`
          );
          report.telegramSent = 1;
        } catch (e) {
          console.error(`Failed to send to ${targetPlayer.telegramId}`, e);
        }
      } else {
        report.telegramSkipped = 1; // این کاربر تلگرام ندارد
      }
    }

    return Response.json(report);
  }

  // ===== حالت همگانی: همه‌ی کاربران =====
  // ۱) پاپ‌آپ داخل بازی (سراسری، رد شدن به‌صورت هر دستگاه)
  //    نکته: پیام همگانی فقط در جدول announcements ثبت می‌شود (نه notifications)،
  //    تا علامت‌گذاری «خوانده‌شده» روی همه اعمال نشود.
  if (channels.inApp) {
    await db.insert(announcements).values({ title, message });
    report.inAppDelivered = -1; // یعنی «برای همه»
  }

  // ۲) پیام تلگرام (فقط کاربرانی که telegramId دارند)
  if (channels.telegram) {
    const allPlayers = await db
      .select({ telegramId: players.telegramId })
      .from(players)
      .where(isNotNull(players.telegramId));

    for (const p of allPlayers) {
      if (p.telegramId) {
        try {
          await sendMessage(p.telegramId, `📢 <b>${title}</b>\n\n${message}`);
          report.telegramSent++;
        } catch (e) {
          console.error(`Failed to send to ${p.telegramId}`, e);
        }
      }
    }
  }

  return Response.json(report);
}

// تابع کمکی استفاده‌نشده برای جلوگیری از هشدار linter (and)
void and;
