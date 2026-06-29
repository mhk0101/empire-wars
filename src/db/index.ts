import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// تنظیمات Connection Pool:
// - max: حداکثر کانکشن همزمان (بالاتر از پیش‌فرض ۱۰ تا برای جلوگیری از اشباع)
// - connectionTimeoutMillis: اگر کانکشن در دسترس نبود، بعد از ۵ ثانیه خطا بده (نه معطل موندن ابدی)
// - idleTimeoutMillis: کانکشن‌های بیکار بعد از ۳۰ ثانیه بسته شوند
// - maxUses: بعد از ۱۰۰ استفاده کانکشن recycle شود (جلوگیری از نشت)
export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 25, // حداکثر ۲۵ کانکشن همزمان
    min: 2, // حداقل ۲ کانکشن آماده
    connectionTimeoutMillis: 5000, // ۵ ثانیه timeout
    idleTimeoutMillis: 30_000, // بستن کانکشن بیکار بعد از ۳۰ ثانیه
    maxUses: 100, // recycle بعد از ۱۰۰ استفاده
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

// مدیریت خطاهای سطح pool (جلوگیری از کرش سرور)
pool.on("error", (err) => {
  console.error("Unexpected error on idle DB client", err);
});

export const db = drizzle(pool);
