// ===== خودکارِ ساخت جدول‌ها و ستون‌های دیتابیس =====
// این ماژول اطمینان می‌دهد که همه‌ی جدول‌ها و ستون‌ها در دیتابیس وجود دارند،
// حتی اگر «drizzle-kit push» اجرا نشده باشد یا جدول‌ها قدیمی/ناقص باشند
// (مثلاً ستون tutorial_done در دیتابیس قدیمی وجود ندارد).
// همه‌ی دستورها با «IF NOT EXISTS» اجرا می‌شوند و هر کدوم جدا اجرا می‌شود،
// پس اگر یکی شکست بخوره، بقیه باز هم اجرا می‌شن.

import { pool } from "./index";

// هر دستور به‌صورت جداگانه — ترتیب مهم است (اول جدول‌ها، بعد ستون‌های جدید)
const STATEMENTS: string[] = [
  // ===== جدول players =====
  `CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(64) UNIQUE,
    device_token VARCHAR(64) UNIQUE,
    username VARCHAR(64) NOT NULL,
    name_chosen BOOLEAN NOT NULL DEFAULT false,
    banned BOOLEAN NOT NULL DEFAULT false,
    gold BIGINT NOT NULL DEFAULT 500,
    food BIGINT NOT NULL DEFAULT 500,
    stone BIGINT NOT NULL DEFAULT 300,
    iron BIGINT NOT NULL DEFAULT 200,
    gems BIGINT NOT NULL DEFAULT 50,
    level INTEGER NOT NULL DEFAULT 1,
    xp BIGINT NOT NULL DEFAULT 0,
    power BIGINT NOT NULL DEFAULT 0,
    buildings JSONB NOT NULL DEFAULT '{"command":1,"goldmine":1,"farm":1,"stonemine":1,"ironworks":1,"warehouse":1,"barracks":1,"lab":1,"market":1,"wall":0}',
    troops JSONB NOT NULL DEFAULT '{"soldier":0,"archer":0,"knight":0,"warmachine":0}',
    research JSONB NOT NULL DEFAULT '{"economy":0,"speed":0,"defense":0,"attack":0,"training":0}',
    clan_id INTEGER,
    clan_role VARCHAR(16) NOT NULL DEFAULT 'member',
    vip_until TIMESTAMP,
    booster_until TIMESTAMP,
    shield_until TIMESTAMP,
    daily_streak INTEGER NOT NULL DEFAULT 0,
    last_daily_claim TIMESTAMP,
    invite_code VARCHAR(16) UNIQUE,
    invited_by INTEGER,
    invite_count INTEGER NOT NULL DEFAULT 0,
    daily_invites INTEGER NOT NULL DEFAULT 0,
    last_invite_date VARCHAR(16) NOT NULL DEFAULT '',
    city_skin VARCHAR(24) NOT NULL DEFAULT 'default',
    profile_skin VARCHAR(24) NOT NULL DEFAULT 'default',
    owned_skins JSONB NOT NULL DEFAULT '["default"]',
    claimed_achievements JSONB NOT NULL DEFAULT '[]',
    starter_pack_bought BOOLEAN NOT NULL DEFAULT false,
    last_daily_login_date VARCHAR(16) NOT NULL DEFAULT '',
    tutorial_done BOOLEAN NOT NULL DEFAULT false,
    attacks_won INTEGER NOT NULL DEFAULT 0,
    attacks_lost INTEGER NOT NULL DEFAULT 0,
    total_gold_earned BIGINT NOT NULL DEFAULT 0,
    last_collect TIMESTAMP NOT NULL DEFAULT now(),
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
  // ستون‌های جدید که ممکن است در دیتابیس قدیمی وجود نداشته باشند:
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS tutorial_done BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE players ADD COLUMN IF NOT EXISTS last_daily_login_date VARCHAR(16) NOT NULL DEFAULT ''`,

  // ===== کلن‌ها =====
  `CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(48) NOT NULL UNIQUE,
    tag VARCHAR(8) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    leader_id INTEGER NOT NULL,
    power BIGINT NOT NULL DEFAULT 0,
    member_count INTEGER NOT NULL DEFAULT 1,
    war_wins INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    xp BIGINT NOT NULL DEFAULT 0,
    treasury_gold BIGINT NOT NULL DEFAULT 0,
    war_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,

  // ===== چت کلن =====
  `CREATE TABLE IF NOT EXISTS clan_messages (
    id SERIAL PRIMARY KEY,
    clan_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    username VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,

  // ===== گزارش نبرد =====
  `CREATE TABLE IF NOT EXISTS battle_reports (
    id SERIAL PRIMARY KEY,
    attacker_id INTEGER NOT NULL,
    defender_id INTEGER NOT NULL,
    attacker_name VARCHAR(64) NOT NULL,
    defender_name VARCHAR(64) NOT NULL,
    win BOOLEAN NOT NULL,
    loot JSONB NOT NULL DEFAULT '{}',
    details TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,

  // ===== بازار =====
  `CREATE TABLE IF NOT EXISTS market_orders (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER NOT NULL,
    seller_name VARCHAR(64) NOT NULL,
    offer_resource VARCHAR(16) NOT NULL,
    offer_amount INTEGER NOT NULL,
    want_resource VARCHAR(16) NOT NULL,
    want_amount INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,

  // ===== صف ساخت =====
  `CREATE TABLE IF NOT EXISTS build_queue (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    building VARCHAR(24) NOT NULL,
    to_level INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT now(),
    finish_at TIMESTAMP NOT NULL
  )`,

  // ===== صف آموزش =====
  `CREATE TABLE IF NOT EXISTS train_queue (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    troop VARCHAR(24) NOT NULL,
    quantity INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT now(),
    finish_at TIMESTAMP NOT NULL
  )`,

  // ===== رویدادهای جهانی =====
  `CREATE TABLE IF NOT EXISTS world_events (
    id SERIAL PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    title VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    ends_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,

  // ===== درخواست پرداخت =====
  `CREATE TABLE IF NOT EXISTS payment_requests (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    username VARCHAR(64) NOT NULL,
    gems INTEGER NOT NULL,
    amount VARCHAR(32) NOT NULL,
    payer_name VARCHAR(64) NOT NULL DEFAULT '',
    ref_code VARCHAR(64) NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP
  )`,

  // ===== لاگ فعالیت =====
  `CREATE TABLE IF NOT EXISTS activity_log (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    icon VARCHAR(8) NOT NULL DEFAULT '•',
    text TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,

  // ===== مأموریت‌ها =====
  `CREATE TABLE IF NOT EXISTS player_missions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    mission_id VARCHAR(32) NOT NULL,
    kind VARCHAR(8) NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    claimed BOOLEAN NOT NULL DEFAULT false,
    period_key VARCHAR(16) NOT NULL
  )`,

  // ===== تنظیمات =====
  `CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(48) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`,

  // ===== اطلاعیه‌های همگانی =====
  `CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,

  // ===== پیام‌های درون‌برنامه‌ای کاربر =====
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    player_id INTEGER,
    title VARCHAR(128) NOT NULL,
    message TEXT NOT NULL,
    icon VARCHAR(8) NOT NULL DEFAULT '🔔',
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT now()
  )`,
];

let initialized = false;
let initPromise: Promise<void> | null = null;

// اطمینان از وجود همه‌ی جدول‌ها و ستون‌ها — فقط یک‌بار در هر پردازش اجرا می‌شود.
// هر دستور جدا اجرا می‌شود تا شکست یکی، بقیه را متوقف نکند.
export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    for (const stmt of STATEMENTS) {
      try {
        await pool.query(stmt);
      } catch (e) {
        // خطای هر دستور را فقط لاگ کن و به بقیه ادامه بده
        console.error("Schema statement failed:", (e as Error).message);
      }
    }
    initialized = true;
  })();

  return initPromise;
}
