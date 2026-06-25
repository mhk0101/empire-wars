import { getOrCreatePlayer, syncPlayer, getPlayerById } from "@/game/session";
import { db } from "@/db";
import { players, buildQueue, trainQueue } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { processQueues } from "@/game/queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const { type, id } = body; // type: building | troop

  let finishAt: Date | null = null;

  if (type === "building") {
    const job = await db.select().from(buildQueue).where(and(eq(buildQueue.id, id), eq(buildQueue.playerId, player.id))).limit(1);
    if (job.length) finishAt = new Date(job[0].finishAt);
  } else if (type === "troop") {
    const job = await db.select().from(trainQueue).where(and(eq(trainQueue.id, id), eq(trainQueue.playerId, player.id))).limit(1);
    if (job.length) finishAt = new Date(job[0].finishAt);
  }

  if (!finishAt) return Response.json({ error: "کار در صف یافت نشد." }, { status: 404 });

  const remainMs = finishAt.getTime() - Date.now();
  const remainMins = Math.max(1, Math.ceil(remainMs / 60_000));
  const gemCost = remainMins; // فرمول ۱ دقیقه = ۱ جم

  if (player.gems < gemCost) {
    return Response.json({ error: `الماس کافی نیست. (${gemCost} جم نیاز است)` }, { status: 400 });
  }

  // کسر جم و پایان فوری
  await db.update(players).set({ gems: player.gems - gemCost }).where(eq(players.id, player.id));
  
  if (type === "building") {
    await db.update(buildQueue).set({ finishAt: new Date() }).where(eq(buildQueue.id, id));
  } else {
    await db.update(trainQueue).set({ finishAt: new Date() }).where(eq(trainQueue.id, id));
  }

  await processQueues(player.id);
  const updated = await getPlayerById(player.id);

  return Response.json({ ok: true, player: updated });
}
