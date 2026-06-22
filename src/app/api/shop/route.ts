import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { SKINS } from "@/game/config";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;
  const now = new Date();

  // خرید اسکین
  if (action === "buySkin") {
    const skin = SKINS.find((s) => s.id === body.skinId);
    if (!skin) return Response.json({ error: "اسکین نامعتبر." }, { status: 400 });
    const owned = player.ownedSkins || ["default"];
    if (owned.includes(skin.id)) {
      return Response.json({ error: "این اسکین را داری." }, { status: 400 });
    }
    if (player.gems < skin.price) {
      return Response.json({ error: "جم کافی نیست." }, { status: 400 });
    }
    const updated = await db
      .update(players)
      .set({ gems: player.gems - skin.price, ownedSkins: [...owned, skin.id] })
      .where(eq(players.id, player.id))
      .returning();
    return Response.json({ player: updated[0] });
  }

  // انتخاب اسکین (از بین خریداری‌شده‌ها)
  if (action === "equipSkin") {
    const skin = SKINS.find((s) => s.id === body.skinId);
    if (!skin) return Response.json({ error: "اسکین نامعتبر." }, { status: 400 });
    const owned = player.ownedSkins || ["default"];
    if (!owned.includes(skin.id)) {
      return Response.json({ error: "ابتدا این اسکین را بخر." }, { status: 400 });
    }
    const field = skin.type === "city" ? "citySkin" : "profileSkin";
    const updated = await db
      .update(players)
      .set({ [field]: skin.id })
      .where(eq(players.id, player.id))
      .returning();
    return Response.json({ player: updated[0] });
  }

  // خرید جم اکنون از طریق پرداخت کارت‌به‌کارت و تأیید ادمین انجام می‌شود (/api/payment)
  if (action === "buyGems") {
    return Response.json(
      { error: "خرید جم از بخش پرداخت کارت‌به‌کارت انجام می‌شود." },
      { status: 400 }
    );
  }

  // فعال‌سازی VIP (۳۰۰ جم برای ۳۰ روز)
  if (action === "vip") {
    if (player.gems < 300) {
      return Response.json({ error: "۳۰۰ جم نیاز دارید." }, { status: 400 });
    }
    const cur = player.vipUntil && new Date(player.vipUntil) > now
      ? new Date(player.vipUntil)
      : now;
    const until = new Date(cur.getTime() + 30 * 86_400_000);
    const updated = await db
      .update(players)
      .set({ gems: player.gems - 300, vipUntil: until })
      .where(eq(players.id, player.id))
      .returning();
    return Response.json({ player: updated[0] });
  }

  // بوستر تولید (۵۰ جم برای ۲۴ ساعت)
  if (action === "booster") {
    if (player.gems < 50) {
      return Response.json({ error: "۵۰ جم نیاز دارید." }, { status: 400 });
    }
    const until = new Date(now.getTime() + 24 * 3600_000);
    const updated = await db
      .update(players)
      .set({ gems: player.gems - 50, boosterUntil: until })
      .where(eq(players.id, player.id))
      .returning();
    return Response.json({ player: updated[0] });
  }

  // سپر دفاعی (۸۰ جم برای ۸ ساعت)
  if (action === "shield") {
    if (player.gems < 80) {
      return Response.json({ error: "۸۰ جم نیاز دارید." }, { status: 400 });
    }
    const until = new Date(now.getTime() + 8 * 3600_000);
    const updated = await db
      .update(players)
      .set({ gems: player.gems - 80, shieldUntil: until })
      .where(eq(players.id, player.id))
      .returning();
    return Response.json({ player: updated[0] });
  }

  return Response.json({ error: "عملیات نامعتبر." }, { status: 400 });
}
