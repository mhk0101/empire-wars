import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import {
  TROOPS,
  troopTrainSeconds,
  type TroopKey,
  type ResourceKey,
} from "@/game/config";
import { processQueues } from "@/game/queue";
import { logActivity } from "@/game/activity";
import { trackMission } from "@/game/missions";
import { db } from "@/db";
import { players, trainQueue } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MAX_TRAIN_QUEUE = 3;

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  await processQueues(base.id);
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const key = body.key as TroopKey;
  const qty = Math.max(1, Math.min(500, Math.floor(Number(body.qty) || 1)));

  if (!key || !TROOPS[key]) {
    return Response.json({ error: "نیروی نامعتبر است." }, { status: 400 });
  }
  if ((player.buildings.barracks ?? 0) < 1) {
    return Response.json({ error: "ابتدا پادگان بسازید." }, { status: 400 });
  }

  const queued = await db
    .select()
    .from(trainQueue)
    .where(eq(trainQueue.playerId, player.id));
  if (queued.length >= MAX_TRAIN_QUEUE) {
    return Response.json(
      { error: `حداکثر ${MAX_TRAIN_QUEUE} آموزش هم‌زمان مجاز است.` },
      { status: 400 }
    );
  }

  const def = TROOPS[key];
  const discount = 1 - (player.research.training ?? 0) * 0.05;
  const totalCost: Partial<Record<ResourceKey, number>> = {};
  for (const [res, amt] of Object.entries(def.cost)) {
    totalCost[res as ResourceKey] = Math.floor((amt ?? 0) * qty * discount);
  }

  for (const [res, amt] of Object.entries(totalCost)) {
    if ((player[res as ResourceKey] as number) < (amt ?? 0)) {
      return Response.json(
        { error: "منابع کافی برای آموزش نیست." },
        { status: 400 }
      );
    }
  }

  // کسر منابع
  const newRes: Partial<Record<ResourceKey, number>> = {};
  for (const [res, amt] of Object.entries(totalCost)) {
    newRes[res as ResourceKey] =
      (player[res as ResourceKey] as number) - (amt ?? 0);
  }
  await db
    .update(players)
    .set({
      ...(newRes.gold !== undefined ? { gold: newRes.gold } : {}),
      ...(newRes.food !== undefined ? { food: newRes.food } : {}),
      ...(newRes.stone !== undefined ? { stone: newRes.stone } : {}),
      ...(newRes.iron !== undefined ? { iron: newRes.iron } : {}),
    })
    .where(eq(players.id, player.id));

  // صف آموزش با تایمر واقعی
  const seconds = troopTrainSeconds(key, qty, player.research.training ?? 0);
  const finishAt = new Date(Date.now() + seconds * 1000);
  await db.insert(trainQueue).values({
    playerId: player.id,
    troop: key,
    quantity: qty,
    finishAt,
  });
  await logActivity(
    player.id,
    "⚔️",
    `آموزش ${qty.toLocaleString("fa-IR")} ${def.name} آغاز شد`
  );
  await trackMission(player.id, "train", qty);

  const updated = await db
    .select()
    .from(players)
    .where(eq(players.id, player.id))
    .limit(1);
  return Response.json({
    player: updated[0],
    queued: { troop: key, finishAt: finishAt.toISOString(), seconds },
  });
}
