import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import {
  RESEARCH,
  researchUpgradeCost,
  computePower,
  levelFromXp,
  XP_REWARDS,
  type ResearchKey,
  type ResourceKey,
} from "@/game/config";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const key = body.key as ResearchKey;

  if (!key || !RESEARCH[key]) {
    return Response.json({ error: "تحقیق نامعتبر است." }, { status: 400 });
  }
  if ((player.buildings.lab ?? 0) < 1) {
    return Response.json({ error: "ابتدا آزمایشگاه بسازید." }, { status: 400 });
  }

  const def = RESEARCH[key];
  const cur = player.research[key] ?? 0;
  if (cur >= def.maxLevel) {
    return Response.json({ error: "تحقیق به حداکثر رسیده است." }, { status: 400 });
  }

  const cost = researchUpgradeCost(key, cur);
  for (const [res, amt] of Object.entries(cost)) {
    if ((player[res as ResourceKey] as number) < (amt ?? 0)) {
      return Response.json({ error: "منابع کافی نیست." }, { status: 400 });
    }
  }

  const newResearch = { ...player.research, [key]: cur + 1 };
  const newRes: Partial<Record<ResourceKey, number>> = {};
  for (const [res, amt] of Object.entries(cost)) {
    newRes[res as ResourceKey] =
      (player[res as ResourceKey] as number) - (amt ?? 0);
  }
  const power = computePower(player.buildings, player.troops, newResearch);
  const newXp = player.xp + XP_REWARDS.research;
  const level = levelFromXp(newXp).level;

  const updated = await db
    .update(players)
    .set({
      research: newResearch,
      xp: newXp,
      level: Math.max(player.level, level),
      power,
      ...(newRes.gold !== undefined ? { gold: newRes.gold } : {}),
      ...(newRes.food !== undefined ? { food: newRes.food } : {}),
      ...(newRes.stone !== undefined ? { stone: newRes.stone } : {}),
      ...(newRes.iron !== undefined ? { iron: newRes.iron } : {}),
      ...(newRes.gems !== undefined ? { gems: newRes.gems } : {}),
    })
    .where(eq(players.id, player.id))
    .returning();

  return Response.json({ player: updated[0] });
}
