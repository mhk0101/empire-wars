import { getOrCreatePlayer, syncPlayer } from "@/game/session";
import { GEM_PACKS } from "@/game/config";
import { getSettings } from "@/game/settings";
import { db } from "@/db";
import { paymentRequests } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

// دریافت اطلاعات کارت و لیست درخواست‌های خود کاربر
export async function GET() {
  const player = await getOrCreatePlayer();
  const mine = await db
    .select()
    .from(paymentRequests)
    .where(eq(paymentRequests.playerId, player.id))
    .orderBy(desc(paymentRequests.createdAt))
    .limit(10);

  const s = await getSettings();
  return Response.json({
    card: s.paymentCard,
    cardHolder: s.paymentCardHolder,
    requests: mine,
  });
}

// ثبت درخواست خرید الماس (کارت‌به‌کارت)
export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const packIndex = Number(body.packIndex);
  const pack = GEM_PACKS[packIndex];
  if (!pack) {
    return Response.json({ error: "بسته نامعتبر است." }, { status: 400 });
  }

  const payerName = String(body.payerName || "").trim().slice(0, 64);
  const refCode = String(body.refCode || "").trim().slice(0, 64);
  if (payerName.length < 2 || refCode.length < 4) {
    return Response.json(
      { error: "نام واریزکننده و کد پیگیری/۴ رقم آخر کارت را کامل وارد کن." },
      { status: 400 }
    );
  }

  // جلوگیری از ثبت چند درخواست در انتظار هم‌زمان
  const pending = await db
    .select()
    .from(paymentRequests)
    .where(
      and(
        eq(paymentRequests.playerId, player.id),
        eq(paymentRequests.status, "pending")
      )
    );
  if (pending.length >= 3) {
    return Response.json(
      { error: "شما درخواست‌های در انتظار زیادی دارید. منتظر تأیید بمان." },
      { status: 400 }
    );
  }

  const inserted = await db
    .insert(paymentRequests)
    .values({
      playerId: player.id,
      username: player.username,
      gems: pack.gems + pack.bonus,
      amount: pack.priceRaw,
      payerName,
      refCode,
      status: "pending",
    })
    .returning();

  return Response.json({ request: inserted[0] });
}
