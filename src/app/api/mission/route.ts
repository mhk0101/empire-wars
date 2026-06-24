import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { DAILY_MISSIONS, ACHIEVEMENTS } from "@/game/config";
import { db } from "@/db";
import { players, achievementClaims } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// وضعیت پیشرفت مأموریت‌ها و دستاوردها
export async function GET() {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;

  // دریافت لیست دستاوردهایی که قبلاً دریافت شده‌اند
  const claims = await db
    .select({ achId: achievementClaims.achievementId })
    .from(achievementClaims)
    .where(eq(achievementClaims.playerId, player.id));
  const claimedSet = new Set(claims.map((c) => c.achId));

  const achievements = ACHIEVEMENTS.map((a) => {
    const value = (player as unknown as Record<string, number>)[a.check] ?? 0;
    const isDone = value >= a.target;
    const isClaimed = claimedSet.has(a.id);

    return {
      id: a.id,
      title: a.title,
      target: a.target,
      value,
      done: isDone,
      claimed: isClaimed,
      reward: a.reward,
    };
  });

  const missions = DAILY_MISSIONS.map((m) => ({
    id: m.id,
    title: m.title,
    reward: m.reward,
  }));

  return Response.json({ missions, achievements });
}

// ادعای جایزه دستاورد
export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const achId = body.achievementId as string;
  const ach = ACHIEVEMENTS.find((a) => a.id === achId);

  if (!ach) return Response.json({ error: "دستاورد نامعتبر." }, { status: 400 });

  // ۱. بررسی اینکه آیا قبلاً دریافت شده؟
  const existing = await db
    .select()
    .from(achievementClaims)
    .where(
      and(
        eq(achievementClaims.playerId, player.id),
        eq(achievementClaims.achievementId, achId)
      )
    )
    .limit(1);

  if (existing.length) {
    return Response.json({ error: "جایزه این دستاورد قبلاً دریافت شده است." }, { status: 400 });
  }

  // ۲. بررسی شرط تکمیل دستاورد
  const value = (player as unknown as Record<string, number>)[ach.check] ?? 0;
  if (value < ach.target) {
    return Response.json({ error: "هنوز این دستاورد تکمیل نشده." }, { status: 400 });
  }

  // ۳. ثبت دریافت جایزه (Transaction-safe)
  await db.insert(achievementClaims).values({
    playerId: player.id,
    achievementId: achId,
  });

  // ۴. واریز جایزه
  const updated = await db
    .update(players)
    .set({ gems: player.gems + (ach.reward.gems ?? 0) })
    .where(eq(players.id, player.id))
    .returning();

  return Response.json({ player: updated[0], reward: ach.reward });
}
