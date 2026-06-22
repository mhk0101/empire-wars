import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { eq, desc, lt, sql } from "drizzle-orm";

// ثبت یک فعالیت برای بازیکن (و نگه‌داری حداکثر ۲۰ مورد)
export async function logActivity(
  playerId: number,
  icon: string,
  text: string
) {
  await db.insert(activityLog).values({ playerId, icon, text });

  // حذف موارد قدیمی‌تر از ۲۰ تای آخر
  const rows = await db
    .select({ id: activityLog.id })
    .from(activityLog)
    .where(eq(activityLog.playerId, playerId))
    .orderBy(desc(activityLog.id))
    .limit(1)
    .offset(20);
  if (rows.length) {
    await db
      .delete(activityLog)
      .where(
        sql`${activityLog.playerId} = ${playerId} and ${activityLog.id} <= ${rows[0].id}`
      );
  }
  void lt;
}

export async function getActivities(playerId: number) {
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.playerId, playerId))
    .orderBy(desc(activityLog.createdAt))
    .limit(20);
}
