import { getOrCreatePlayer, syncPlayer, getPlayerById } from "@/game/session";
import {
  TROOPS,
  computePower,
  levelFromXp,
  XP_REWARDS,
  type TroopKey,
} from "@/game/config";
import { isShielded } from "@/game/logic";
import { processQueues } from "@/game/queue";
import { logActivity } from "@/game/activity";
import { trackMission } from "@/game/missions";
import { db } from "@/db";
import { players, battleReports } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// ✅ بخش حمله فعال است.
// برای غیرفعال‌کردن دوباره، مقدار زیر را true کن.
const ATTACK_DISABLED = false;

export async function POST(req: Request) {
  if (ATTACK_DISABLED) {
    return Response.json(
      { error: "بخش حمله فعلاً غیرفعال است و به‌زودی فعال می‌شود." },
      { status: 403 }
    );
  }
  const base = await getOrCreatePlayer();
  await processQueues(base.id);
  const attacker = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const targetId = Number(body.targetId);

  if (!targetId || targetId === attacker.id) {
    return Response.json({ error: "هدف نامعتبر است." }, { status: 400 });
  }

  await processQueues(targetId);
  const target = await syncPlayer(targetId);
  if (!target) {
    return Response.json({ error: "هدف پیدا نشد." }, { status: 404 });
  }
  if (isShielded(target)) {
    return Response.json(
      { error: "این بازیکن تحت سپر دفاعی است." },
      { status: 400 }
    );
  }

  // قدرت حمله بازیکن + بونوس تحقیق آموزش رزمی
  let atkPower = 0;
  let hasTroops = false;
  for (const [k, count] of Object.entries(attacker.troops)) {
    const def = TROOPS[k as TroopKey];
    if (def && count > 0) {
      atkPower += def.attack * count;
      hasTroops = true;
    }
  }
  const atkResearch = 1 + (attacker.research.attack ?? 0) * 0.15;
  atkPower = atkPower * atkResearch;
  if (!hasTroops) {
    return Response.json(
      { error: "نیرویی برای حمله ندارید! ابتدا در پادگان نیرو آموزش دهید." },
      { status: 400 }
    );
  }

  // قدرت دفاع هدف + بونوس تحقیق دفاع + دیوار
  const defResearch = 1 + (target.research.defense ?? 0) * 0.15;
  const wallBonus = 1 + (target.buildings.wall ?? 0) * 0.04;
  let defPower = 50; // پایه دفاع شهر
  for (const [k, count] of Object.entries(target.troops)) {
    const def = TROOPS[k as TroopKey];
    if (def && count > 0) defPower += def.defense * count;
  }
  defPower = defPower * defResearch * wallBonus;

  // کمی تصادفی بودن
  const rng = 0.85 + Math.random() * 0.3;
  const effectiveAtk = atkPower * rng;
  const win = effectiveAtk > defPower;

  let loot: Record<string, number> = {};
  const newAttackerTroops = { ...attacker.troops };
  const newTargetTroops = { ...target.troops };

  if (win) {
    // غنیمت: ۲۵٪ منابع هدف
    loot = {
      gold: Math.floor(target.gold * 0.25),
      food: Math.floor(target.food * 0.25),
      stone: Math.floor(target.stone * 0.25),
    };
    // تلفات کم برای مهاجم، زیاد برای مدافع
    for (const k of Object.keys(newAttackerTroops)) {
      newAttackerTroops[k] = Math.floor(newAttackerTroops[k] * 0.92);
    }
    for (const k of Object.keys(newTargetTroops)) {
      newTargetTroops[k] = Math.floor(newTargetTroops[k] * 0.7);
    }
  } else {
    // مهاجم تلفات سنگین
    for (const k of Object.keys(newAttackerTroops)) {
      newAttackerTroops[k] = Math.floor(newAttackerTroops[k] * 0.6);
    }
    for (const k of Object.keys(newTargetTroops)) {
      newTargetTroops[k] = Math.floor(newTargetTroops[k] * 0.9);
    }
  }

  const now = new Date();
  // XP و سطح مهاجم
  const newXp =
    attacker.xp + (win ? XP_REWARDS.attackWin : XP_REWARDS.attackLoss);
  const newLevel = levelFromXp(newXp).level;
  // به‌روزرسانی مهاجم
  await db
    .update(players)
    .set({
      troops: newAttackerTroops,
      gold: attacker.gold + (loot.gold ?? 0),
      food: attacker.food + (loot.food ?? 0),
      stone: attacker.stone + (loot.stone ?? 0),
      attacksWon: attacker.attacksWon + (win ? 1 : 0),
      attacksLost: attacker.attacksLost + (win ? 0 : 1),
      totalGoldEarned: attacker.totalGoldEarned + (loot.gold ?? 0),
      xp: newXp,
      level: Math.max(attacker.level, newLevel),
      power: computePower(attacker.buildings, newAttackerTroops, attacker.research),
    })
    .where(eq(players.id, attacker.id));

  // به‌روزرسانی هدف + سپر ۴ ساعته بعد از حمله
  await db
    .update(players)
    .set({
      troops: newTargetTroops,
      gold: Math.max(0, target.gold - (loot.gold ?? 0)),
      food: Math.max(0, target.food - (loot.food ?? 0)),
      stone: Math.max(0, target.stone - (loot.stone ?? 0)),
      shieldUntil: new Date(now.getTime() + 6 * 3600_000),
      power: computePower(target.buildings, newTargetTroops, target.research),
    })
    .where(eq(players.id, target.id));

  const details = win
    ? `پیروزی! قدرت حمله ${Math.floor(effectiveAtk)} در برابر دفاع ${Math.floor(defPower)}.`
    : `شکست. قدرت حمله ${Math.floor(effectiveAtk)} در برابر دفاع ${Math.floor(defPower)}.`;

  await db.insert(battleReports).values({
    attackerId: attacker.id,
    defenderId: target.id,
    attackerName: attacker.username,
    defenderName: target.username,
    win,
    loot,
    details,
  });

  // فعالیت‌ها و مأموریت
  await logActivity(
    attacker.id,
    win ? "🏆" : "💀",
    win
      ? `حمله موفق به ${target.username} (+${Math.floor(loot.gold ?? 0)} طلا)`
      : `حمله ناموفق به ${target.username}`
  );
  await logActivity(
    target.id,
    "🛡️",
    `${attacker.username} به تو حمله کرد — ${win ? "شکست خوردی" : "دفاع موفق"}`
  );
  await trackMission(attacker.id, "attack", 1);

  const updated = await getPlayerById(attacker.id);
  return Response.json({ win, loot, details, player: updated });
}
