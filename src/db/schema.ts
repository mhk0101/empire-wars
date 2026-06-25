import {
  pgTable,
  serial,
  text,
  integer,
  bigint,
  timestamp,
  boolean,
  jsonb,
  varchar,
} from "drizzle-orm/pg-core";

// بازیکنان
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  telegramId: varchar("telegram_id", { length: 64 }).unique(),
  deviceToken: varchar("device_token", { length: 64 }).unique(),
  username: varchar("username", { length: 64 }).notNull(),
  nameChosen: boolean("name_chosen").notNull().default(false),
  banned: boolean("banned").notNull().default(false),
  // منابع
  gold: bigint("gold", { mode: "number" }).notNull().default(500),
  food: bigint("food", { mode: "number" }).notNull().default(500),
  stone: bigint("stone", { mode: "number" }).notNull().default(300),
  iron: bigint("iron", { mode: "number" }).notNull().default(200),
  gems: bigint("gems", { mode: "number" }).notNull().default(50),
  // وضعیت
  level: integer("level").notNull().default(1),
  xp: bigint("xp", { mode: "number" }).notNull().default(0),
  power: bigint("power", { mode: "number" }).notNull().default(0),
  // ساختمان‌ها به صورت سطح (jsonb)
  buildings: jsonb("buildings")
    .$type<Record<string, number>>()
    .notNull()
    .default({
      command: 1,
      goldmine: 1,
      farm: 1,
      stonemine: 1,
      ironworks: 1,
      warehouse: 1,
      barracks: 1,
      lab: 1,
      market: 1,
      wall: 0,
    }),
  // نیروها
  troops: jsonb("troops")
    .$type<Record<string, number>>()
    .notNull()
    .default({ soldier: 0, archer: 0, knight: 0, warmachine: 0 }),
  // تحقیقات (سطح هر تکنولوژی)
  research: jsonb("research")
    .$type<Record<string, number>>()
    .notNull()
    .default({ economy: 0, speed: 0, defense: 0, attack: 0, training: 0 }),
  // وضعیت ها
  clanId: integer("clan_id"),
  clanRole: varchar("clan_role", { length: 16 }).notNull().default("member"),
  vipUntil: timestamp("vip_until"),
  boosterUntil: timestamp("booster_until"),
  shieldUntil: timestamp("shield_until"),
  // پاداش روزانه
  dailyStreak: integer("daily_streak").notNull().default(0),
  lastDailyClaim: timestamp("last_daily_claim"),
  // دعوت
  inviteCode: varchar("invite_code", { length: 16 }).unique(),
  invitedBy: integer("invited_by"),
  inviteCount: integer("invite_count").notNull().default(0),
  dailyInvites: integer("daily_invites").notNull().default(0),
  lastInviteDate: varchar("last_invite_date", { length: 16 }).notNull().default(""),
  // اسکین‌ها
  citySkin: varchar("city_skin", { length: 24 }).notNull().default("default"),
  profileSkin: varchar("profile_skin", { length: 24 }).notNull().default("default"),
  ownedSkins: jsonb("owned_skins").$type<string[]>().notNull().default(["default"]),
  claimedAchievements: jsonb("claimed_achievements").$type<string[]>().notNull().default([]),
  starterPackBought: boolean("starter_pack_bought").notNull().default(false),
  lastDailyLoginDate: varchar("last_daily_login_date", { length: 16 }).notNull().default(""),
  // آمار
  attacksWon: integer("attacks_won").notNull().default(0),
  attacksLost: integer("attacks_lost").notNull().default(0),
  totalGoldEarned: bigint("total_gold_earned", { mode: "number" })
    .notNull()
    .default(0),
  // زمان آخرین برداشت منابع
  lastCollect: timestamp("last_collect").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // VIP Level (اضافه شده در migrations)
  vipLevel: integer("vip_level").notNull().default(0),
});

// کلن‌ها
export const clans = pgTable("clans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 48 }).notNull().unique(),
  tag: varchar("tag", { length: 8 }).notNull(),
  description: text("description").notNull().default(""),
  leaderId: integer("leader_id").notNull(),
  power: bigint("power", { mode: "number" }).notNull().default(0),
  memberCount: integer("member_count").notNull().default(1),
  warWins: integer("war_wins").notNull().default(0),
  level: integer("level").notNull().default(1),
  xp: bigint("xp", { mode: "number" }).notNull().default(0),
  treasuryGold: bigint("treasury_gold", { mode: "number" }).notNull().default(0),
  warPoints: integer("war_points").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// پیام‌های چت کلن
export const clanMessages = pgTable("clan_messages", {
  id: serial("id").primaryKey(),
  clanId: integer("clan_id").notNull(),
  playerId: integer("player_id").notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// گزارش‌های حمله / نبرد
export const battleReports = pgTable("battle_reports", {
  id: serial("id").primaryKey(),
  attackerId: integer("attacker_id").notNull(),
  defenderId: integer("defender_id").notNull(),
  attackerName: varchar("attacker_name", { length: 64 }).notNull(),
  defenderName: varchar("defender_name", { length: 64 }).notNull(),
  win: boolean("win").notNull(),
  loot: jsonb("loot").$type<Record<string, number>>().notNull().default({}),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// سفارش‌های بازار
export const marketOrders = pgTable("market_orders", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(),
  sellerName: varchar("seller_name", { length: 64 }).notNull(),
  // چه چیزی می‌فروشد
  offerResource: varchar("offer_resource", { length: 16 }).notNull(),
  offerAmount: integer("offer_amount").notNull(),
  // در ازای چه چیزی
  wantResource: varchar("want_resource", { length: 16 }).notNull(),
  wantAmount: integer("want_amount").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// صف ساخت/ارتقا ساختمان (تایمر واقعی)
export const buildQueue = pgTable("build_queue", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  building: varchar("building", { length: 24 }).notNull(),
  toLevel: integer("to_level").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishAt: timestamp("finish_at").notNull(),
});

// صف آموزش نیرو (تایمر واقعی)
export const trainQueue = pgTable("train_queue", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  troop: varchar("troop", { length: 24 }).notNull(),
  quantity: integer("quantity").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishAt: timestamp("finish_at").notNull(),
});

// رویدادهای جهانی
export const worldEvents = pgTable("world_events", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 32 }).notNull(),
  title: varchar("title", { length: 128 }).notNull(),
  description: text("description").notNull(),
  active: boolean("active").notNull().default(true),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// درخواست‌های خرید الماس (کارت‌به‌کارت + تأیید ادمین)
export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  gems: integer("gems").notNull(),
  amount: varchar("amount", { length: 32 }).notNull(), // مبلغ به تومان
  // اطلاعاتی که کاربر وارد می‌کند برای تأیید واریز
  payerName: varchar("payer_name", { length: 64 }).notNull().default(""),
  refCode: varchar("ref_code", { length: 64 }).notNull().default(""), // کد پیگیری / ۴ رقم آخر کارت
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// فعالیت‌های اخیر بازیکن (لاگ)
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  icon: varchar("icon", { length: 8 }).notNull().default("•"),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// مأموریت‌های روزانه/هفتگی بازیکن (پیشرفت و دریافت)
export const playerMissions = pgTable("player_missions", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull(),
  missionId: varchar("mission_id", { length: 32 }).notNull(),
  kind: varchar("kind", { length: 8 }).notNull(), // daily | weekly
  progress: integer("progress").notNull().default(0),
  claimed: boolean("claimed").notNull().default(false),
  periodKey: varchar("period_key", { length: 16 }).notNull(), // برای ریست روزانه/هفتگی
});

// تنظیمات قابل ویرایش از پنل ادمین (key/value)
export const settings = pgTable("settings", {
  key: varchar("key", { length: 48 }).primaryKey(),
  value: text("value").notNull().default(""),
});

// اطلاعیه‌ها و پیام‌های همگانی
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 128 }).notNull(),
  message: text("message").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// جدول Notifications (اعلان‌های داخل بازی)
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id"),
  title: varchar("title", { length: 128 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 16 }).notNull().default("info"),
  icon: varchar("icon", { length: 8 }).notNull().default("📢"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
