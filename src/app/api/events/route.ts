import { db } from "@/db";
import { worldEvents } from "@/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

// رویدادهای ممکن — هرکدام مدت زمان مشخصی دارند
const POOL = [
  {
    type: "zombie",
    title: "🧟 حمله زامبی‌ها",
    description:
      "همه فرماندهان سرور برای دفع موج زامبی‌ها باید همکاری کنند. مشارکت در دفاع جم به همراه دارد!",
    hours: 48,
  },
  {
    type: "economy",
    title: "🎉 جشنواره منابع",
    description: "تولید همه منابع تا پایان رویداد دو برابر است! بهترین زمان برای جمع‌آوری.",
    hours: 24,
  },
  {
    type: "world",
    title: "⚔️ جنگ جهانی",
    description:
      "کل سرور درگیر یک نبرد بزرگ شده است. کلن‌ها برای تسلط بر قلمرو رقابت می‌کنند.",
    hours: 72,
  },
  {
    type: "boost",
    title: "🏗️ هفته ساخت‌وساز",
    description: "سرعت ساخت ساختمان‌ها افزایش یافته است. شهرت را سریع‌تر توسعه بده!",
    hours: 36,
  },
];

export async function GET() {
  const now = new Date();

  // غیرفعال‌کردن رویدادهای منقضی‌شده
  await db
    .update(worldEvents)
    .set({ active: false })
    .where(and(eq(worldEvents.active, true)));

  // فقط رویدادهای فعال و دارای زمان معتبر را نگه دار
  let rows = await db
    .select()
    .from(worldEvents)
    .where(and(eq(worldEvents.active, true), gt(worldEvents.endsAt, now)))
    .orderBy(desc(worldEvents.createdAt));

  // اگر رویداد فعالی نیست، یک رویداد جدید بساز
  if (rows.length === 0) {
    const pick = POOL[Math.floor(Math.random() * POOL.length)];
    const endsAt = new Date(now.getTime() + pick.hours * 3600_000);
    await db.insert(worldEvents).values({
      type: pick.type,
      title: pick.title,
      description: pick.description,
      active: true,
      endsAt,
    });
    rows = await db
      .select()
      .from(worldEvents)
      .where(and(eq(worldEvents.active, true), gt(worldEvents.endsAt, now)))
      .orderBy(desc(worldEvents.createdAt));
  }

  return Response.json({ events: rows, now: now.toISOString() });
}
