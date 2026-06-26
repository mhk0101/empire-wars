import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// علامت‌گذاری آموزش به‌عنوان تکمیل‌شده (دیگر نشان داده نمی‌شود)
export async function POST() {
  const player = await getOrCreatePlayer();
  if (player.tutorialDone) {
    return Response.json({ ok: true, alreadyDone: true });
  }
  const updated = await db
    .update(players)
    .set({ tutorialDone: true })
    .where(eq(players.id, player.id))
    .returning();
  return Response.json({ ok: true, player: updated[0] });
}
