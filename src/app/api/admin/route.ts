import { getSettings, saveSettings, SETTING_DEFAULTS } from "@/game/settings";
import { db } from "@/db";
import {
  paymentRequests,
  players,
  clans,
  battleReports,
  marketOrders,
  buildQueue,
  trainQueue,
  activityLog,
  playerMissions,
  clanMessages,
} from "@/db/schema";
import { eq, desc, ilike, or, sql, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function checkAuth(req: Request): Promise<boolean> {
  const s = await getSettings();
  return req.headers.get("x-admin-pass") === s.adminPassword;
}

// ===== GET: داده‌های پنل =====
export async function GET(req: Request) {
  if (!(await checkAuth(req))) {
    return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const url = new URL(req.url);
  const view = url.searchParams.get("view") ?? "payments";

  // تنظیمات
  if (view === "settings") {
    const s = await getSettings(true);
    return Response.json({ settings: s, keys: Object.keys(SETTING_DEFAULTS) });
  }

  // درخواست‌های پرداخت
  if (view === "payments") {
    const rows = await db
      .select()
      .from(paymentRequests)
      .orderBy(desc(paymentRequests.createdAt))
      .limit(100);
    return Response.json({ requests: rows });
  }

  // جستجو/لیست کاربران
  if (view === "players") {
    const q = (url.searchParams.get("q") ?? "").trim();
    const base = db
      .select({
        id: players.id,
        username: players.username,
        level: players.level,
        power: players.power,
        gold: players.gold,
        gems: players.gems,
        banned: players.banned,
        attacksWon: players.attacksWon,
        createdAt: players.createdAt,
      })
      .from(players);
    const rows = q
      ? await base
          .where(
            or(
              ilike(players.username, `%${q}%`),
              sql`cast(${players.id} as text) = ${q}`
            )
          )
          .orderBy(desc(players.power))
          .limit(50)
      : await base.orderBy(desc(players.power)).limit(50);
    return Response.json({ players: rows });
  }

  // آمار کلی
  if (view === "stats") {
    const totalPlayers = (await db.select({ c: count() }).from(players))[0].c;
    const totalClans = (await db.select({ c: count() }).from(clans))[0].c;
    const totalBattles = (await db.select({ c: count() }).from(battleReports))[0]
      .c;
    const banned = (
      await db
        .select({ c: count() })
        .from(players)
        .where(eq(players.banned, true))
    )[0].c;
    const pendingPays = (
      await db
        .select({ c: count() })
        .from(paymentRequests)
        .where(eq(paymentRequests.status, "pending"))
    )[0].c;
    const online = (
      await db
        .select({ c: count() })
        .from(players)
        .where(sql`${players.lastCollect} > now() - interval '15 minutes'`)
    )[0].c;
    return Response.json({
      stats: {
        totalPlayers,
        totalClans,
        totalBattles,
        banned,
        pendingPays,
        online,
      },
    });
  }

  return Response.json({ error: "نمای نامعتبر" }, { status: 400 });
}

// ===== POST: عملیات =====
export async function POST(req: Request) {
  if (!(await checkAuth(req))) {
    return Response.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const action = String(body.action);

  // --- ذخیره تنظیمات ---
  if (action === "saveSettings") {
    const patch = (body.settings || {}) as Record<string, string>;
    // فقط کلیدهای مجاز
    const allowed: Record<string, string> = {};
    for (const k of Object.keys(SETTING_DEFAULTS)) {
      if (patch[k] !== undefined) allowed[k] = String(patch[k]);
    }
    await saveSettings(allowed);
    return Response.json({ ok: true });
  }

  // --- تأیید/رد پرداخت ---
  if (action === "approve" || action === "reject") {
    const id = Number(body.id);
    const found = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id))
      .limit(1);
    if (!found.length)
      return Response.json({ error: "درخواست پیدا نشد." }, { status: 404 });
    const reqRow = found[0];
    if (reqRow.status !== "pending")
      return Response.json({ error: "قبلاً بررسی شده." }, { status: 400 });

    if (action === "approve") {
      const pl = await db
        .select()
        .from(players)
        .where(eq(players.id, reqRow.playerId))
        .limit(1);
      if (pl.length) {
        await db
          .update(players)
          .set({ gems: pl[0].gems + reqRow.gems })
          .where(eq(players.id, reqRow.playerId));
      }
    }
    await db
      .update(paymentRequests)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        reviewedAt: new Date(),
      })
      .where(eq(paymentRequests.id, id));
    return Response.json({ ok: true });
  }

  // --- مدیریت کاربر ---
  const playerId = Number(body.playerId);

  if (action === "ban" || action === "unban") {
    await db
      .update(players)
      .set({ banned: action === "ban" })
      .where(eq(players.id, playerId));
    return Response.json({ ok: true });
  }

  if (action === "setResources") {
    const patch: Record<string, number> = {};
    for (const k of ["gold", "food", "stone", "iron", "gems"]) {
      if (body[k] !== undefined && body[k] !== "") {
        patch[k] = Math.max(0, Math.floor(Number(body[k])));
      }
    }
    if (Object.keys(patch).length === 0) {
      return Response.json({ error: "مقداری وارد نشده." }, { status: 400 });
    }
    await db.update(players).set(patch).where(eq(players.id, playerId));
    return Response.json({ ok: true });
  }

  if (action === "rename") {
    const username = String(body.username || "").trim().slice(0, 24);
    if (username.length < 3)
      return Response.json({ error: "نام کوتاه است." }, { status: 400 });
    await db.update(players).set({ username }).where(eq(players.id, playerId));
    return Response.json({ ok: true });
  }

  if (action === "delete") {
    // حذف کامل کاربر و داده‌های مرتبط
    await db.delete(buildQueue).where(eq(buildQueue.playerId, playerId));
    await db.delete(trainQueue).where(eq(trainQueue.playerId, playerId));
    await db.delete(activityLog).where(eq(activityLog.playerId, playerId));
    await db.delete(playerMissions).where(eq(playerMissions.playerId, playerId));
    await db.delete(clanMessages).where(eq(clanMessages.playerId, playerId));
    await db.delete(marketOrders).where(eq(marketOrders.sellerId, playerId));
    await db.delete(paymentRequests).where(eq(paymentRequests.playerId, playerId));
    await db.delete(players).where(eq(players.id, playerId));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "عملیات نامعتبر." }, { status: 400 });
}
