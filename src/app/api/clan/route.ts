import { getOrCreatePlayer, syncPlayer, getPlayerById } from "@/game/session";
import { db } from "@/db";
import { players, clans, clanMessages } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getOrCreatePlayer();
  const allClans = await db
    .select()
    .from(clans)
    .orderBy(desc(clans.power))
    .limit(50);

  let myClan = null;
  let members: { id: number; username: string; power: number; level: number }[] = [];
  let messages: typeof clanMessages.$inferSelect[] = [];

  if (me.clanId) {
    const c = await db.select().from(clans).where(eq(clans.id, me.clanId)).limit(1);
    myClan = c[0] ?? null;
    if (myClan) {
      members = await db
        .select({
          id: players.id,
          username: players.username,
          power: players.power,
          level: players.level,
          clanRole: players.clanRole,
        })
        .from(players)
        .where(eq(players.clanId, myClan.id))
        .orderBy(desc(players.power));
      messages = await db
        .select()
        .from(clanMessages)
        .where(eq(clanMessages.clanId, myClan.id))
        .orderBy(asc(clanMessages.createdAt))
        .limit(50);
    }
  }

  return Response.json({ allClans, myClan, members, messages, meId: me.id });
}

export async function POST(req: Request) {
  const base = await getOrCreatePlayer();
  const player = (await syncPlayer(base.id)) ?? base;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "create") {
    if (player.clanId) {
      return Response.json({ error: "شما عضو یک کلن هستید." }, { status: 400 });
    }
    const name = String(body.name || "").trim().slice(0, 48);
    const tag = String(body.tag || "").trim().slice(0, 8);
    if (name.length < 3 || tag.length < 2) {
      return Response.json({ error: "نام یا تگ کلن کوتاه است." }, { status: 400 });
    }
    if (player.gems < 100) {
      return Response.json({ error: "ساخت کلن ۱۰۰ جم نیاز دارد." }, { status: 400 });
    }
    const exists = await db.select().from(clans).where(eq(clans.name, name)).limit(1);
    if (exists.length) {
      return Response.json({ error: "این نام قبلاً استفاده شده." }, { status: 400 });
    }
    const inserted = await db
      .insert(clans)
      .values({
        name,
        tag,
        description: String(body.description || "").slice(0, 200),
        leaderId: player.id,
        power: player.power,
        memberCount: 1,
      })
      .returning();
    await db
      .update(players)
      .set({ clanId: inserted[0].id, gems: player.gems - 100 })
      .where(eq(players.id, player.id));
    const updated = await getPlayerById(player.id);
    return Response.json({ player: updated, clan: inserted[0] });
  }

  if (action === "join") {
    if (player.clanId) {
      return Response.json({ error: "شما عضو یک کلن هستید." }, { status: 400 });
    }
    const clanId = Number(body.clanId);
    const c = await db.select().from(clans).where(eq(clans.id, clanId)).limit(1);
    if (!c.length) return Response.json({ error: "کلن پیدا نشد." }, { status: 404 });
    if (c[0].memberCount >= 50) {
      return Response.json({ error: "این کلن پر است." }, { status: 400 });
    }
    await db
      .update(players)
      .set({ clanId })
      .where(eq(players.id, player.id));
    await db
      .update(clans)
      .set({
        memberCount: c[0].memberCount + 1,
        power: c[0].power + player.power,
      })
      .where(eq(clans.id, clanId));
    const updated = await getPlayerById(player.id);
    return Response.json({ player: updated });
  }

  // انتصاب معاون توسط رهبر
  if (action === "promote") {
    if (!player.clanId) {
      return Response.json({ error: "عضو کلنی نیستید." }, { status: 400 });
    }
    const c = await db.select().from(clans).where(eq(clans.id, player.clanId)).limit(1);
    if (!c.length || c[0].leaderId !== player.id) {
      return Response.json({ error: "فقط رهبر می‌تواند معاون انتخاب کند." }, { status: 403 });
    }
    const memberId = Number(body.memberId);
    const m = await getPlayerById(memberId);
    if (!m || m.clanId !== player.clanId) {
      return Response.json({ error: "این عضو در کلن شما نیست." }, { status: 400 });
    }
    const newRole = m.clanRole === "officer" ? "member" : "officer";
    await db
      .update(players)
      .set({ clanRole: newRole })
      .where(eq(players.id, memberId));
    return Response.json({ ok: true, role: newRole });
  }

  if (action === "leave") {
    if (!player.clanId) {
      return Response.json({ error: "عضو کلنی نیستید." }, { status: 400 });
    }
    const c = await db.select().from(clans).where(eq(clans.id, player.clanId)).limit(1);
    if (c.length) {
      const newCount = Math.max(0, c[0].memberCount - 1);
      if (newCount === 0) {
        await db.delete(clans).where(eq(clans.id, c[0].id));
      } else {
        await db
          .update(clans)
          .set({
            memberCount: newCount,
            power: Math.max(0, c[0].power - player.power),
          })
          .where(eq(clans.id, c[0].id));
        // اگر رهبر کلن را ترک می‌کند، رهبری به قوی‌ترین عضو منتقل شود
        if (c[0].leaderId === player.id) {
          const next = await db
            .select()
            .from(players)
            .where(eq(players.clanId, c[0].id))
            .orderBy(desc(players.power))
            .limit(1);
          if (next.length) {
            await db
              .update(players)
              .set({ clanRole: "leader" })
              .where(eq(players.id, next[0].id));
            await db
              .update(clans)
              .set({ leaderId: next[0].id })
              .where(eq(clans.id, c[0].id));
          }
        }
      }
    }
    await db.update(players).set({ clanId: null, clanRole: "member" }).where(eq(players.id, player.id));
    const updated = await getPlayerById(player.id);
    return Response.json({ player: updated });
  }

  if (action === "help") {
    // کمک به کلن: اهدای ۱۰۰۰ طلا → صندوق کلن + قدرت + تجربه کلن
    if (!player.clanId) {
      return Response.json({ error: "عضو کلنی نیستید." }, { status: 400 });
    }
    if (player.gold < 1000) {
      return Response.json({ error: "حداقل ۱۰۰۰ طلا نیاز است." }, { status: 400 });
    }
    const c = await db.select().from(clans).where(eq(clans.id, player.clanId)).limit(1);
    if (!c.length) return Response.json({ error: "کلن پیدا نشد." }, { status: 404 });
    await db
      .update(players)
      .set({ gold: player.gold - 1000 })
      .where(eq(players.id, player.id));

    // تجربه و سطح کلن (هر ۱۰۰۰ XP یک سطح)
    const newXp = c[0].xp + 100;
    const newLevel = Math.floor(newXp / 1000) + 1;
    await db
      .update(clans)
      .set({
        power: c[0].power + 200,
        treasuryGold: c[0].treasuryGold + 1000,
        xp: newXp,
        level: Math.max(c[0].level, newLevel),
      })
      .where(eq(clans.id, player.clanId));
    const updated = await getPlayerById(player.id);
    return Response.json({ player: updated });
  }

  if (action === "chat") {
    if (!player.clanId) {
      return Response.json({ error: "عضو کلنی نیستید." }, { status: 400 });
    }
    const message = String(body.message || "").trim().slice(0, 300);
    if (!message) return Response.json({ error: "پیام خالی است." }, { status: 400 });
    await db.insert(clanMessages).values({
      clanId: player.clanId,
      playerId: player.id,
      username: player.username,
      message,
    });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "عملیات نامعتبر." }, { status: 400 });
}
