import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { announcements, playerAnnouncements } from "@/db/schema";
import { eq, and, isNull, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// دریافت اطلاعیه‌های فعال که کاربر هنوز ندیده/نبسته
export async function GET() {
  const player = await getOrCreatePlayer();

  // اطلاعیه‌های فعال مربوط به این کاربر:
  // 1. targetType = 'all' (همه کاربران)
  // 2. targetType = 'specific' AND targetPlayerId = player.id
  // و channel شامل 'site' یا 'both' باشد
  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      message: announcements.message,
      channel: announcements.channel,
      dismissible: announcements.dismissible,
      createdAt: announcements.createdAt,
      dismissed: playerAnnouncements.dismissed,
    })
    .from(announcements)
    .leftJoin(
      playerAnnouncements,
      and(
        eq(playerAnnouncements.announcementId, announcements.id),
        eq(playerAnnouncements.playerId, player.id)
      )
    )
    .where(
      and(
        eq(announcements.active, true),
        or(
          eq(announcements.targetType, "all"),
          and(
            eq(announcements.targetType, "specific"),
            eq(announcements.targetPlayerId, player.id)
          )
        ),
        or(
          eq(announcements.channel, "site"),
          eq(announcements.channel, "both")
        )
      )
    )
    .orderBy(sql`${announcements.createdAt} desc`);

  // فقط اونایی که dismissible=false هستن (همیشه نشون بده) یا dismissed=false
  const visible = rows.filter((r) => !r.dismissed || r.dismissible === false);

  return Response.json({
    notifications: visible.map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message,
      dismissible: r.dismissible,
      createdAt: r.createdAt,
    })),
  });
}

// بستن/دismiss یک اطلاعیه
export async function POST(req: Request) {
  const player = await getOrCreatePlayer();
  const body = await req.json().catch(() => ({}));
  const annId = Number(body.id);

  if (!annId) {
    return Response.json({ error: "شناسه اطلاعیه الزامی است." }, { status: 400 });
  }

  await db
    .insert(playerAnnouncements)
    .values({
      playerId: player.id,
      announcementId: annId,
      dismissed: true,
      dismissedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [playerAnnouncements.playerId, playerAnnouncements.announcementId],
      set: { dismissed: true, dismissedAt: new Date() },
    });

  return Response.json({ ok: true });
}
