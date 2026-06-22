import { getOrCreatePlayer } from "@/game/session";
import { getActivities } from "@/game/activity";

export const dynamic = "force-dynamic";

export async function GET() {
  const player = await getOrCreatePlayer();
  const items = await getActivities(player.id);
  return Response.json({ items });
}
