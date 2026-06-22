import { getOrCreatePlayer } from "@/game/session";
import { db } from "@/db";
import { players } from "@/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

// تولید چند پیشنهاد نام بر اساس نام درخواستی
function makeSuggestions(base: string): string[] {
  const clean = base.replace(/\s+/g, " ").slice(0, 18);
  const sfx = ["⚔️", "👑", "🔥", "_۲", "_برتر", "_شاه"];
  const out = new Set<string>();
  for (let i = 0; out.size < 6 && i < 30; i++) {
    if (i < sfx.length) {
      out.add(`${clean}${sfx[i]}`.slice(0, 24));
    } else {
      out.add(`${clean}${Math.floor(Math.random() * 9999)}`.slice(0, 24));
    }
  }
  return [...out];
}

// تغییر نام کاربری
export async function POST(req: Request) {
  const player = await getOrCreatePlayer();
  const body = await req.json().catch(() => ({}));
  const raw = String(body.username || "").trim();
  const username = raw.replace(/\s+/g, " ").slice(0, 24);

  if (username.length < 3) {
    return Response.json(
      { error: "نام کاربری باید حداقل ۳ کاراکتر باشد." },
      { status: 400 }
    );
  }

  // بررسی تکراری نبودن
  const dup = await db
    .select({ id: players.id })
    .from(players)
    .where(and(eq(players.username, username), ne(players.id, player.id)))
    .limit(1);

  if (dup.length) {
    // پیشنهاد نام‌های آزاد
    const candidates = makeSuggestions(username);
    const taken = await db
      .select({ username: players.username })
      .from(players)
      .where(inArray(players.username, candidates));
    const takenSet = new Set(taken.map((t) => t.username));
    const free = candidates.filter((c) => !takenSet.has(c)).slice(0, 4);
    return Response.json(
      {
        error: "این نام کاربری قبلاً استفاده شده است.",
        suggestions: free,
      },
      { status: 409 }
    );
  }

  const updated = await db
    .update(players)
    .set({ username, nameChosen: true })
    .where(eq(players.id, player.id))
    .returning();

  return Response.json({ player: updated[0] });
}
