import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { players } from "@/db/schema";
import { ne, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getOrCreatePlayer();
  const rows = await db
    .select({
      id: players.id,
      username: players.username,
      level: players.level,
      power: players.power,
      gold: players.gold,
      shieldUntil: players.shieldUntil,
    })
    .from(players)
    .where(ne(players.id, me.id))
    .orderBy(sql`random()`)
    .limit(12);

  return Response.json({ targets: rows, now: new Date().toISOString() });
}
