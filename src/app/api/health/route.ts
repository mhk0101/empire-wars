import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSchema } from "@/db/init";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // اطمینان از وجود جدول‌ها (در محیط‌های تازه هم کار می‌کند)
    await ensureSchema();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
