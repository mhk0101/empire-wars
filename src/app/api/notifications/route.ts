import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// دریافت اعلان‌های خوانده نشده
export async function GET() {
  const player = await getOrCreatePlayer();
  if (!player) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await db.execute(sql`
    SELECT * FROM notifications 
    WHERE (player_id = ${player.id} OR player_id IS NULL) 
    AND read = false 
    ORDER BY created_at DESC 
    LIMIT 20
  `);

  return Response.json({ notifications: notifications.rows });
}

// علامت‌گذاری به عنوان خوانده شده
export async function POST(req: Request) {
  const player = await getOrCreatePlayer();
  if (!player) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const notifId = body.id;

  if (!notifId) {
    return Response.json({ error: "ID required" }, { status: 400 });
  }

  await db.execute(sql`
    UPDATE notifications 
    SET read = true 
    WHERE id = ${notifId} 
    AND (player_id = ${player.id} OR player_id IS NULL)
  `);

  return Response.json({ success: true });
}
