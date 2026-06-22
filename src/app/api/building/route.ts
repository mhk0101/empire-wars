import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import {
  BUILDINGS,
  buildingUpgradeCost,
  buildingTimeSeconds,
  type BuildingKey,
  type ResourceKey,
} from "@/game/config";
import { processQueues, countActiveBuilds } from "@/game/queue";
import { logActivity } from "@/game/activity";
import { trackMission } from "@/game/missions";
import { db } from "@/db";
import { players, buildQueue } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const MAX_BUILD_QUEUE = 2; // حداکثر کارهای هم‌زمان ساخت

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  await processQueues(base.id);
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const key = body.key as BuildingKey;

  if (!key || !BUILDINGS[key]) {
    return Response.json({ error: "ساختمان نامعتبر است." }, { status: 400 });
  }

  const def = BUILDINGS[key];
  const curLevel = player.buildings[key] ?? 0;

  if (curLevel >= def.maxLevel) {
    return Response.json(
      { error: "این ساختمان به سطح حداکثر رسیده است." },
      { status: 400 }
    );
  }

  // بررسی صف: نباید این ساختمان از قبل در صف باشد
  const queued = await db
    .select()
    .from(buildQueue)
    .where(eq(buildQueue.playerId, player.id));
  if (queued.some((q) => q.building === key)) {
    return Response.json(
      { error: "این ساختمان هم‌اکنون در حال ارتقا است." },
      { status: 400 }
    );
  }
  if (queued.length >= MAX_BUILD_QUEUE) {
    return Response.json(
      { error: `حداکثر ${MAX_BUILD_QUEUE} ساخت هم‌زمان مجاز است.` },
      { status: 400 }
    );
  }

  // محدودیت سطح مرکز فرماندهی (با احتساب کارهای در صف فرماندهی)
  const commandLevel = player.buildings.command ?? 1;
  const commandInQueue = queued.some((q) => q.building === "command");
  const effectiveCommand = commandLevel + (commandInQueue ? 1 : 0);
  if (key !== "command" && curLevel >= effectiveCommand) {
    return Response.json(
      { error: "ابتدا باید مرکز فرماندهی را ارتقا دهید." },
      { status: 400 }
    );
  }

  const cost = buildingUpgradeCost(key, curLevel);
  for (const [res, amt] of Object.entries(cost)) {
    const have = player[res as ResourceKey] as number;
    if (have < (amt ?? 0)) {
      return Response.json(
        { error: "منابع کافی نیست." },
        { status: 400 }
      );
    }
  }

  // کسر منابع
  const newRes: Partial<Record<ResourceKey, number>> = {};
  for (const [res, amt] of Object.entries(cost)) {
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
      ...(newRes.gems !== undefined ? { gems: newRes.gems } : {}),
    })
    .where(eq(players.id, player.id));

  // افزودن به صف با تایمر واقعی
  const seconds = buildingTimeSeconds(curLevel, player.research.speed ?? 0);
  const finishAt = new Date(Date.now() + seconds * 1000);
  await db.insert(buildQueue).values({
    playerId: player.id,
    building: key,
    toLevel: curLevel + 1,
    finishAt,
  });
  await logActivity(
    player.id,
    "🏗️",
    `ارتقای ${def.name} به سطح ${curLevel + 1} آغاز شد`
  );
  await trackMission(player.id, "upgrade", 1);

  await countActiveBuilds(player.id);
  const updated = await db
    .select()
    .from(players)
    .where(eq(players.id, player.id))
    .limit(1);
  return Response.json({
    player: updated[0],
    queued: { building: key, finishAt: finishAt.toISOString(), seconds },
  });
}
