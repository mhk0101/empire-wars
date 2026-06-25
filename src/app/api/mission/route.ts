import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { DAILY_MISSIONS, ACHIEVEMENTS } from "@/game/config";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

// وضعیت پیشرفت مأموریت‌ها و دستاوردها
export async function GET() {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;

  const achievements = ACHIEVEMENTS.map((a) => {
    const value = (player as unknown as Record<string, number>)[a.check] ?? 0;
    return {
      id: a.id,
      title: a.title,
      target: a.target,
      value,
      done: value >= a.target,
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

// ادعای جایزه دستاورد (تک-بار)
export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const achId = body.achievementId as string;
  const ach = ACHIEVEMENTS.find((a) => a.id === achId);
  if (!ach) return Response.json({ error: "دستاورد نامعتبر." }, { status: 400 });

  // بررسی اینکه قبلاً دریافت شده یا نه
  const claimed = player.claimedAchievements || [];
  if (claimed.includes(achId)) {
    return Response.json({ error: "جایزه این دستاورد قبلاً دریافت شده است." }, { status: 400 });
  }

  const value = (player as unknown as Record<string, number>)[ach.check] ?? 0;
  if (value < ach.target) {
    return Response.json({ error: "هنوز این دستاورد تکمیل نشده." }, { status: 400 });
  }

  const updated = await db
    .update(players)
    .set({
      gems: player.gems + (ach.reward.gems ?? 0),
      claimedAchievements: [...claimed, achId]
    })
    .where(eq(players.id, player.id))
    .returning();
  return Response.json({ player: updated[0], reward: ach.reward });
}
