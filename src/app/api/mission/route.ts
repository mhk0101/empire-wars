import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { DAILY_MISSIONS, ACHIEVEMENTS } from "@/game/config";
import { db } from "@/db";
import { players, playerMissions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// وضعیت پیشرفت مأموریت‌ها و دستاوردها
export async function GET() {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;

  const claimedRows = await db
    .select()
    .from(playerMissions)
    .where(eq(playerMissions.playerId, player.id));

  const achievements = ACHIEVEMENTS.map((a) => {
    const value = (player as unknown as Record<string, number>)[a.check] ?? 0;
    const row = claimedRows.find(r => r.missionId === a.id);
    return {
      id: a.id,
      title: a.title,
      target: a.target,
      value,
      done: value >= a.target,
      claimed: row?.claimed ?? false,
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

  // بررسی وضعیت قبلی در جدول مأموریت‌ها/دستاوردها
  const existing = await db
    .select()
    .from(playerMissions)
    .where(
      and(
        eq(playerMissions.playerId, player.id),
        eq(playerMissions.missionId, achId)
      )
    )
    .limit(1);

  if (existing.length && existing[0].claimed) {
    return Response.json({ error: "جایزه این دستاورد قبلاً دریافت شده است." }, { status: 400 });
  }

  const value = (player as unknown as Record<string, number>)[ach.check] ?? 0;
  if (value < ach.target) {
    return Response.json({ error: "هنوز شرایط این دستاورد را کسب نکرده‌اید." }, { status: 400 });
  }

  // ثبت به عنوان دریافت شده
  if (existing.length) {
    await db.update(playerMissions).set({ claimed: true }).where(eq(playerMissions.id, existing[0].id));
  } else {
    await db.insert(playerMissions).values({
      playerId: player.id,
      missionId: achId,
      kind: "achieve",
      progress: value,
      claimed: true,
      periodKey: "permanent"
    });
  }

  const updated = await db
    .update(players)
    .set({ gems: player.gems + (ach.reward.gems ?? 0) })
    .where(eq(players.id, player.id))
    .returning();

  return Response.json({ player: updated[0], reward: ach.reward });
}
