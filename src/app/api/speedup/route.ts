import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { db } from "@/db";
import { buildQueue, trainQueue, players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { processQueues } from "@/game/queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const type = body.type; // 'build' | 'train'
  const id = Number(body.id);

  if (!id || !["build", "train"].includes(type)) {
    return Response.json({ error: "درخواست نامعتبر" }, { status: 400 });
  }

  const table = type === "build" ? buildQueue : trainQueue;
  const found = await db.select().from(table).where(eq(table.id, id)).limit(1);

  if (!found.length || found[0].playerId !== player.id) {
    return Response.json({ error: "آیتم پیدا نشد" }, { status: 404 });
  }

  const item = found[0];
  const now = Date.now();
  const finish = new Date(item.finishAt).getTime();
  const remainingSecs = Math.max(0, (finish - now) / 1000);
  const gemCost = Math.ceil(remainingSecs / 60);

  if (player.gems < gemCost) {
    return Response.json({ error: "الماس کافی نیست" }, { status: 400 });
  }

  // کسر جم و اتمام فوری
  await db
    .update(players)
    .set({ gems: player.gems - gemCost })
    .where(eq(players.id, player.id));

  await db
    .update(table)
    .set({ finishAt: new Date(now - 1000) }) // تنظیم زمان به گذشته برای اتمام فوری
    .where(eq(table.id, id));

  // پردازش صف بلافاصله
  await processQueues(player.id);

  const updatedPlayer = await db.select().from(players).where(eq(players.id, player.id)).limit(1);

  return Response.json({ 
    success: true, 
    player: updatedPlayer[0],
    message: "عملیات با موفقیت به پایان رسید."
  });
}
