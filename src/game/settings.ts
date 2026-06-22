import { db } from "@/db";
import { settings } from "@/db/schema";
import {
  PAYMENT_CARD,
  PAYMENT_CARD_HOLDER,
  ADMIN_PASSWORD,
} from "./config";

// تنظیمات پیش‌فرض (در صورت نبودن مقدار در دیتابیس از این‌ها استفاده می‌شود)
export const SETTING_DEFAULTS: Record<string, string> = {
  paymentCard: PAYMENT_CARD,
  paymentCardHolder: PAYMENT_CARD_HOLDER,
  adminPassword: ADMIN_PASSWORD,
  // پاداش روزانه ۷ روزه (طلا) — روز هفتم جم
  daily1: "100",
  daily2: "200",
  daily3: "300",
  daily4: "500",
  daily5: "800",
  daily6: "1200",
  daily7Gems: "30",
  // پاداش دعوت
  inviteGold: "500",
  inviteGems: "20",
  inviteGoldNew: "300",
  inviteGemsNew: "10",
  inviteDailyLimit: "2",
  // منابع اولیه بازیکن جدید
  startGold: "500",
  startFood: "500",
  startStone: "300",
  startIron: "200",
  startGems: "50",
  // قیمت بسته‌های جم (تومان)
  gemPack1Price: "99000",
  gemPack2Price: "399000",
  gemPack3Price: "699000",
};

let cache: Record<string, string> | null = null;
let cacheTime = 0;
const TTL = 10_000; // ۱۰ ثانیه کش

// بارگذاری همه تنظیمات (با کش کوتاه)
export async function getSettings(force = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!force && cache && now - cacheTime < TTL) return cache;
  const rows = await db.select().from(settings);
  const map: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  cache = map;
  cacheTime = now;
  return map;
}

export async function getSetting(key: string): Promise<string> {
  const all = await getSettings();
  return all[key] ?? SETTING_DEFAULTS[key] ?? "";
}

export async function getSettingNum(key: string): Promise<number> {
  return Number(await getSetting(key)) || 0;
}

// ذخیره چند تنظیم (از پنل ادمین)
export async function saveSettings(patch: Record<string, string>) {
  for (const [key, value] of Object.entries(patch)) {
    await db
      .insert(settings)
      .values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: String(value) },
      });
  }
  cache = null; // باطل‌کردن کش
}
