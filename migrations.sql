-- ============================================================
-- Empire Wars - Database Migrations (Full Rebalance)
-- اجرا: psql -U postgres -d app_db -f migrations.sql
-- ============================================================

-- 1. جدول Notifications (سیستم اعلان داخل بازی)
CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  player_id integer,
  title varchar(128) NOT NULL,
  message text NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'info',
  icon varchar(8) NOT NULL DEFAULT '📢',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id, read);

-- 2. جدول Speed Up History (ثبت تسریع‌ها)
CREATE TABLE IF NOT EXISTS speedup_history (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  type varchar(16) NOT NULL,
  item_id integer NOT NULL,
  minutes_saved integer NOT NULL,
  gems_spent integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

-- 3. جدول VIP Tiers (سطوح VIP)
CREATE TABLE IF NOT EXISTS vip_tiers (
  level integer PRIMARY KEY,
  name varchar(32) NOT NULL,
  production_bonus integer NOT NULL,
  build_speed_bonus integer NOT NULL,
  train_speed_bonus integer NOT NULL,
  builder_slots integer NOT NULL,
  monthly_price_gems integer NOT NULL
);

INSERT INTO vip_tiers (level, name, production_bonus, build_speed_bonus, train_speed_bonus, builder_slots, monthly_price_gems) VALUES
(1, 'برنزی', 10, 10, 10, 1, 99),
(2, 'نقره‌ای', 20, 20, 20, 1, 299),
(3, 'طلایی', 30, 30, 30, 2, 699),
(4, 'الماسی', 50, 50, 50, 3, 1499)
ON CONFLICT (level) DO NOTHING;

-- 4. اضافه کردن فیلد vip_level به players
ALTER TABLE players ADD COLUMN IF NOT EXISTS vip_level integer NOT NULL DEFAULT 0;

-- 5. جدول Boosters (بوسترهای Premium)
CREATE TABLE IF NOT EXISTS active_boosters (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  type varchar(16) NOT NULL,
  multiplier integer NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boosters_player ON active_boosters(player_id, expires_at);

-- 6. جدول Referral Milestones (پاداش‌های پله‌ای دعوت)
CREATE TABLE IF NOT EXISTS referral_milestones (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  milestone integer NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamp,
  UNIQUE(player_id, milestone)
);

-- 7. جدول Seasonal Events (رویدادهای فصلی)
CREATE TABLE IF NOT EXISTS seasons (
  id serial PRIMARY KEY,
  name varchar(64) NOT NULL,
  description text NOT NULL,
  starts_at timestamp NOT NULL,
  ends_at timestamp NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

-- 8. جدول Seasonal Rewards (جوایز فصلی)
CREATE TABLE IF NOT EXISTS seasonal_rewards (
  id serial PRIMARY KEY,
  season_id integer NOT NULL,
  player_id integer NOT NULL,
  rank integer NOT NULL,
  gems integer NOT NULL DEFAULT 0,
  gold bigint NOT NULL DEFAULT 0,
  skin varchar(32),
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamp,
  UNIQUE(season_id, player_id)
);

-- 9. جدول Cosmetic Items (آیتم‌های ظاهری)
CREATE TABLE IF NOT EXISTS cosmetic_items (
  id serial PRIMARY KEY,
  type varchar(16) NOT NULL,
  name varchar(64) NOT NULL,
  description text,
  price_gems integer NOT NULL,
  icon varchar(64),
  available boolean NOT NULL DEFAULT true
);

INSERT INTO cosmetic_items (type, name, description, price_gems, icon) VALUES
('city_skin', 'قلعه طلایی', 'اسکین طلایی برای شهر شما', 200, '🏰'),
('city_skin', 'قلعه یخی', 'اسکین یخی برای شهر شما', 300, '❄️'),
('city_skin', 'قلعه آتشین', 'اسکین آتشین برای شهر شما', 400, '🔥'),
('profile_frame', 'قاب طلایی', 'قاب طلایی برای پروفایل', 150, '🖼️'),
('profile_frame', 'قاب الماس', 'قاب الماسی برای پروفایل', 500, '💎')
ON CONFLICT DO NOTHING;

-- 10. جدول Player Cosmetics (آیتم‌های خریداری شده)
CREATE TABLE IF NOT EXISTS player_cosmetics (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  item_id integer NOT NULL,
  purchased_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(player_id, item_id)
);

-- 11. اضافه کردن فیلد claimed_achievements به players (اگر نباشد)
-- این فیلد از قبل در schema هست، فقط چک می‌کنیم

-- 12. جدول Battle Queue (صف حملات با تایمر)
CREATE TABLE IF NOT EXISTS battle_queue (
  id serial PRIMARY KEY,
  attacker_id integer NOT NULL,
  defender_id integer NOT NULL,
  troops jsonb NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  arrives_at timestamp NOT NULL,
  completed boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_battle_queue_attacker ON battle_queue(attacker_id, completed);

-- 13. اضافه کردن فیلدهای جدید به payment_requests
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS package_type varchar(32);
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS is_starter_pack boolean DEFAULT false;

-- 14. جدول Shop Packages (بسته‌های فروشگاه)
CREATE TABLE IF NOT EXISTS shop_packages (
  id serial PRIMARY KEY,
  type varchar(32) NOT NULL,
  name varchar(64) NOT NULL,
  description text,
  gems integer,
  gold bigint,
  vip_days integer,
  booster_hours integer,
  price_irr integer NOT NULL,
  one_time_only boolean NOT NULL DEFAULT false,
  available boolean NOT NULL DEFAULT true
);

INSERT INTO shop_packages (type, name, description, gems, gold, vip_days, booster_hours, price_irr, one_time_only) VALUES
('starter', 'بسته شروع', '200 جم + 5000 طلا + VIP 1 روزه + بوستر', 200, 5000, 1, 24, 49000, true),
('gems_small', 'بسته کوچک', '100 جم', 100, 0, 0, 0, 59000, false),
('gems_medium', 'بسته متوسط', '500 جم', 500, 0, 0, 0, 249000, false),
('gems_large', 'بسته بزرگ', '1200 جم', 1200, 0, 0, 0, 499000, false)
ON CONFLICT DO NOTHING;

-- 15. اضافه کردن ایندکس‌های بهینه‌سازی
CREATE INDEX IF NOT EXISTS idx_players_power ON players(power DESC);
CREATE INDEX IF NOT EXISTS idx_players_level ON players(level DESC);
CREATE INDEX IF NOT EXISTS idx_battle_reports_attacker ON battle_reports(attacker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_battle_reports_defender ON battle_reports(defender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_build_queue_player ON build_queue(player_id, finish_at);
CREATE INDEX IF NOT EXISTS idx_train_queue_player ON train_queue(player_id, finish_at);

-- 16. آپدیت تنظیمات پیش‌فرض
INSERT INTO settings (key, value) VALUES
('speedup_cost_per_minute', '1'),
('production_booster_price', '50'),
('build_booster_price', '50'),
('train_booster_price', '50'),
('booster_duration_hours', '24'),
('battle_travel_time_seconds', '10'),
('max_battle_history', '20')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- پایان Migrations
-- ============================================================
