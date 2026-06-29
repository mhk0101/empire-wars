// ===== تأیید هویت تلگرام (Mini App initData) =====
// وقتی کاربر از داخل تلگرام وارد بازی می‌شود، تلگرام initData امضا شده می‌فرستد
// که شامل آیدی و نام کاربر است. ما آن را تأیید می‌کنیم تا همان اکانت ربات پیدا شود.

import { createHmac } from "crypto";

export interface TgUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

// تأیید امضای initData و استخراج اطلاعات کاربر
// برمی‌گرداند: null اگر نامعتبر بود، در غیر این صورت اطلاعات کاربر
export function verifyTelegramInitData(initData: string): TgUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !initData) return null;

  try {
    // تجزیه‌ی query string
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    // بررسی اعتبار زمان (initData نباید خیلی قدیم باشد — حداکثر ۲۴ ساعت)
    const authDate = Number(params.get("auth_date") || 0);
    if (!authDate) return null;
    const ageSec = Date.now() / 1000 - authDate;
    if (ageSec > 86400) return null; // بیش از ۲۴ ساعت

    // ساخت data_check_string: همه‌ی پارامترها به‌جز hash، مرتب، با \n به هم وصل
    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    // ساخت secret_key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // محاسبه‌ی امضای مورد انتظار
    const computedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // مقایسه‌ی امن (timing-safe)
    if (computedHash.length !== hash.length) return null;

    // استخراج اطلاعات کاربر
    const userJson = params.get("user");
    if (!userJson) return null;
    const user = JSON.parse(userJson) as TgUser;
    if (!user.id) return null;

    // تأیید نهایی امضا
    let mismatch = 0;
    for (let i = 0; i < computedHash.length; i++) {
      mismatch |= computedHash.charCodeAt(i) ^ hash.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    return user;
  } catch {
    return null;
  }
}
