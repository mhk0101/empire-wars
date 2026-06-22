import { db } from "@/db";
import { players, clans } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getOrCreatePlayer } from "@/game/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "power";
  const me = await getOrCreatePlayer();

  if (type === "clan") {
    const rows = await db
      .select()
      .from(clans)
      .orderBy(desc(clans.power))
      .limit(50);
    return Response.json({ type, rows });
  }

  // ستون مرتب‌سازی و مقدار مربوط به هر نوع
  const valueOf = (p: {
    power: number;
    totalGoldEarned: number;
    attacksWon: number;
    level: number;
    xp: number;
  }) =>
    type === "wealth"
      ? p.totalGoldEarned
      : type === "attacks"
        ? p.attacksWon
        : type === "level"
          ? p.xp
          : p.power;

  const orderCol =
    type === "wealth"
      ? players.totalGoldEarned
      : type === "attacks"
        ? players.attacksWon
        : type === "level"
          ? players.xp
          : players.power;

  const rows = await db
    .select({
      id: players.id,
      username: players.username,
      level: players.level,
      power: players.power,
      xp: players.xp,
      totalGoldEarned: players.totalGoldEarned,
      attacksWon: players.attacksWon,
    })
    .from(players)
    .orderBy(desc(orderCol))
    .limit(100);

  // محاسبه رتبه من و فاصله تا نفر بالاتر
  const myVal = valueOf(me);
  const myIndex = rows.findIndex((r) => r.id === me.id);
  let myRank = myIndex >= 0 ? myIndex + 1 : null;
  let gap: number | null = null;
  if (myIndex > 0) {
    gap = valueOf(rows[myIndex - 1]) - myVal;
  }
  // اگر بازیکن در ۱۰۰ نفر اول نبود، رتبه تقریبی
  if (myRank === null) {
    const higher = rows.filter((r) => valueOf(r) > myVal).length;
    myRank = higher + 1;
  }

  return Response.json({
    type,
    rows: rows.slice(0, 50),
    me: { id: me.id, rank: myRank, value: myVal, gap },
  });
}
