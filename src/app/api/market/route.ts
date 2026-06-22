import { getOrCreatePlayer, syncPlayer, getPlayerById } from "@/game/session";
import { MARKET_FEE, type ResourceKey } from "@/game/config";
import { db } from "@/db";
import { players, marketOrders } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TRADABLE = ["gold", "food", "stone", "iron"];

export async function GET() {
  const me = await getOrCreatePlayer();
  const rows = await db
    .select()
    .from(marketOrders)
    .orderBy(desc(marketOrders.createdAt))
    .limit(50);
  return Response.json({ orders: rows, meId: me.id });
}

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  // ساخت سفارش جدید
  if (action === "create") {
    const offerResource = body.offerResource as ResourceKey;
    const wantResource = body.wantResource as ResourceKey;
    const offerAmount = Math.floor(Number(body.offerAmount));
    const wantAmount = Math.floor(Number(body.wantAmount));

    if (
      !TRADABLE.includes(offerResource) ||
      !TRADABLE.includes(wantResource) ||
      offerResource === wantResource ||
      offerAmount <= 0 ||
      wantAmount <= 0
    ) {
      return Response.json({ error: "سفارش نامعتبر است." }, { status: 400 });
    }
    if ((player[offerResource] as number) < offerAmount) {
      return Response.json({ error: "منابع کافی نیست." }, { status: 400 });
    }

    // قفل کردن منابع پیشنهادی
    await db
      .update(players)
      .set({ [offerResource]: (player[offerResource] as number) - offerAmount })
      .where(eq(players.id, player.id));

    await db.insert(marketOrders).values({
      sellerId: player.id,
      sellerName: player.username,
      offerResource,
      offerAmount,
      wantResource,
      wantAmount,
    });
    const updated = await getPlayerById(player.id);
    return Response.json({ player: updated });
  }

  // خرید سفارش
  if (action === "buy") {
    const orderId = Number(body.orderId);
    const found = await db
      .select()
      .from(marketOrders)
      .where(eq(marketOrders.id, orderId))
      .limit(1);
    if (!found.length) {
      return Response.json({ error: "سفارش پیدا نشد." }, { status: 404 });
    }
    const order = found[0];
    if (order.sellerId === player.id) {
      return Response.json({ error: "نمی‌توانید سفارش خود را بخرید." }, { status: 400 });
    }
    const want = order.wantResource as ResourceKey;
    const offer = order.offerResource as ResourceKey;
    if ((player[want] as number) < order.wantAmount) {
      return Response.json({ error: "منابع کافی برای خرید نیست." }, { status: 400 });
    }

    // کارمزد ۵٪ از مبلغ پرداختی خریدار کسر می‌شود
    const fee = Math.floor(order.wantAmount * MARKET_FEE);
    const sellerReceives = order.wantAmount - fee;

    // خریدار: می‌دهد want، می‌گیرد offer
    await db
      .update(players)
      .set({
        [want]: (player[want] as number) - order.wantAmount,
        [offer]: (player[offer] as number) + order.offerAmount,
      })
      .where(eq(players.id, player.id));

    // فروشنده: دریافت want منهای کارمزد
    const seller = await getPlayerById(order.sellerId);
    if (seller) {
      await db
        .update(players)
        .set({ [want]: (seller[want] as number) + sellerReceives })
        .where(eq(players.id, seller.id));
    }

    await db.delete(marketOrders).where(eq(marketOrders.id, orderId));
    const updated = await getPlayerById(player.id);
    return Response.json({ player: updated, fee });
  }

  // لغو سفارش
  if (action === "cancel") {
    const orderId = Number(body.orderId);
    const found = await db
      .select()
      .from(marketOrders)
      .where(eq(marketOrders.id, orderId))
      .limit(1);
    if (!found.length || found[0].sellerId !== player.id) {
      return Response.json({ error: "سفارش نامعتبر است." }, { status: 400 });
    }
    const order = found[0];
    const offer = order.offerResource as ResourceKey;
    await db
      .update(players)
      .set({ [offer]: (player[offer] as number) + order.offerAmount })
      .where(eq(players.id, player.id));
    await db.delete(marketOrders).where(eq(marketOrders.id, orderId));
    const updated = await getPlayerById(player.id);
    return Response.json({ player: updated });
  }

  return Response.json({ error: "عملیات نامعتبر." }, { status: 400 });
}
