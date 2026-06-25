import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// دریافت اعلان‌های اختصاصی خوانده‌نشده‌ی این کاربر
// (پیام‌های همگانی از طریق جدول announcements و پاپ‌آپ سراسری نمایش داده می‌شوند)
export async function GET() {
  const player = await getOrCreatePlayer();
  if (!player) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(eq(notifications.playerId, player.id), eq(notifications.read, false))
    )
    .orderBy(desc(notifications.createdAt))
    .limit(20);

  return Response.json({
    notifications: rows.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      icon: n.icon,
    })),
  });
}

// علامت‌گذاری یک اعلان اختصاصی به‌عنوان خوانده‌شده
export async function POST(req: Request) {
  const player = await getOrCreatePlayer();
  if (!player) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const notifId = Number(body.id);
  if (!notifId) {
    return Response.json({ error: "ID required" }, { status: 400 });
  }

  // فقط اعلان مال خود این کاربر را می‌توان خوانده‌شده کرد (امنیت)
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notifId),
        eq(notifications.playerId, player.id)
      )
    );

  return Response.json({ success: true });
}
