import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { getMissionStatus, claimMission } from "@/game/missions";
import { getPlayerById } from "@/game/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const player = await getOrCreatePlayer();
  const status = await getMissionStatus(player.id);
  return Response.json(status);
}

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  await syncPlayer(base.id);
  const body = await req.json().catch(() => ({}));
  const missionId = String(body.missionId || "");
  const res = await claimMission(base.id, missionId);
  if ("error" in res) {
    return Response.json({ error: res.error }, { status: 400 });
  }
  const player = await getPlayerById(base.id);
  return Response.json({ player, reward: res.reward });
}
