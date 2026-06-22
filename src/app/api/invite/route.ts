import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/game/activity";
import { trackMission } from "@/game/missions";
import { INVITE_MILESTONES } from "@/game/config";
import { getSettings } from "@/game/settings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const player = await getOrCreatePlayer();
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim().toUpperCase();

  if (player.invitedBy) {
    return Response.json({ error: "شما قبلاً دعوت شده‌اید." }, { status: 400 });
  }
  if (!code || code === player.inviteCode) {
    return Response.json({ error: "کد نامعتبر است." }, { status: 400 });
  }

  const inviter = await db
    .select()
    .from(players)
    .where(eq(players.inviteCode, code))
    .limit(1);
  if (!inviter.length) {
    return Response.json({ error: "کد دعوت پیدا نشد." }, { status: 404 });
  }

  const inv = inviter[0];
  const s = await getSettings();
  const rGold = Number(s.inviteGold) || 500;
  const rGems = Number(s.inviteGems) || 20;
  const rGoldNew = Number(s.inviteGoldNew) || 300;
  const rGemsNew = Number(s.inviteGemsNew) || 10;
  const dailyLimit = Number(s.inviteDailyLimit) || 2;

  // محدودیت دعوت روزانه
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = inv.lastInviteDate === today ? inv.dailyInvites : 0;
  if (usedToday >= dailyLimit) {
    return Response.json(
      { error: `این کاربر امروز به سقف دعوت (${dailyLimit} نفر در روز) رسیده است.` },
      { status: 400 }
    );
  }

  // پاداش پلکانی
  const newCount = inv.inviteCount + 1;
  const milestone = INVITE_MILESTONES.find((m) => m.count === newCount);
  const bonusGems = milestone?.gems ?? 0;

  // پاداش دعوت‌کننده
  await db
    .update(players)
    .set({
      gold: inv.gold + rGold,
      gems: inv.gems + rGems + bonusGems,
      inviteCount: newCount,
      dailyInvites: usedToday + 1,
      lastInviteDate: today,
    })
    .where(eq(players.id, inv.id));

  await logActivity(
    inv.id,
    "👥",
    milestone
      ? `دعوت موفق! به ${newCount} دعوت رسیدی (+${bonusGems} جم پاداش ویژه)`
      : `دعوت موفق! +${rGold} طلا +${rGems} جم`
  );
  await trackMission(inv.id, "invite", 1);

  // پاداش دعوت‌شونده
  const updated = await db
    .update(players)
    .set({
      invitedBy: inv.id,
      gold: player.gold + rGoldNew,
      gems: player.gems + rGemsNew,
    })
    .where(eq(players.id, player.id))
    .returning();

  return Response.json({ player: updated[0], inviter: inv.username });
}
