import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { battleReports } from "@/db/schema";
import { or, eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getOrCreatePlayer();
  const rows = await db
    .select()
    .from(battleReports)
    .where(
      or(eq(battleReports.attackerId, me.id), eq(battleReports.defenderId, me.id))
    )
    .orderBy(desc(battleReports.createdAt))
    .limit(20);

  return Response.json({ reports: rows, meId: me.id });
}
