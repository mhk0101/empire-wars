-- ============================================================
-- Empire Wars - Complete Database Setup (V2.5 Enhanced)
-- اجرا: psql -U postgres -d app_db -f setup_complete.sql
-- ============================================================

-- حذف جداول قدیمی (اختیاری)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS speedup_history CASCADE;
DROP TABLE IF EXISTS vip_tiers CASCADE;
DROP TABLE IF EXISTS active_boosters CASCADE;
DROP TABLE IF EXISTS referral_milestones CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS seasonal_rewards CASCADE;
DROP TABLE IF EXISTS cosmetic_items CASCADE;
DROP TABLE IF EXISTS player_cosmetics CASCADE;
DROP TABLE IF EXISTS battle_queue CASCADE;
DROP TABLE IF EXISTS shop_packages CASCADE;

DROP TABLE IF EXISTS player_missions CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS payment_requests CASCADE;
DROP TABLE IF EXISTS world_events CASCADE;
DROP TABLE IF EXISTS train_queue CASCADE;
DROP TABLE IF EXISTS build_queue CASCADE;
DROP TABLE IF EXISTS market_orders CASCADE;
DROP TABLE IF EXISTS battle_reports CASCADE;
DROP TABLE IF EXISTS clan_messages CASCADE;
DROP TABLE IF EXISTS clans CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS combat_queue CASCADE;

-- ===================== جداول اصلی =====================

CREATE TABLE players (
  id serial PRIMARY KEY,
  telegram_id varchar(64) UNIQUE,
  device_token varchar(64) UNIQUE,
  username varchar(64) NOT NULL,
  name_chosen boolean NOT NULL DEFAULT false,
  banned boolean NOT NULL DEFAULT false,
  gold bigint NOT NULL DEFAULT 500,
  food bigint NOT NULL DEFAULT 500,
  stone bigint NOT NULL DEFAULT 300,
  iron bigint NOT NULL DEFAULT 200,
  gems bigint NOT NULL DEFAULT 50,
  level integer NOT NULL DEFAULT 1,
  xp bigint NOT NULL DEFAULT 0,
  power bigint NOT NULL DEFAULT 0,
  buildings jsonb NOT NULL DEFAULT '{"command":1,"goldmine":1,"farm":1,"stonemine":1,"ironworks":1,"warehouse":1,"barracks":1,"lab":1,"market":1,"wall":0}',
  troops jsonb NOT NULL DEFAULT '{"soldier":0,"archer":0,"knight":0,"warmachine":0}',
  research jsonb NOT NULL DEFAULT '{"economy":0,"speed":0,"defense":0,"attack":0,"training":0}',
  clan_id integer,
  clan_role varchar(16) NOT NULL DEFAULT 'member',
  vip_until timestamp,
  booster_until timestamp,
  shield_until timestamp,
  daily_streak integer NOT NULL DEFAULT 0,
  last_daily_claim timestamp,
  invite_code varchar(16) UNIQUE,
  invited_by integer,
  invite_count integer NOT NULL DEFAULT 0,
  daily_invites integer NOT NULL DEFAULT 0,
  last_invite_date varchar(16) NOT NULL DEFAULT '',
  city_skin varchar(24) NOT NULL DEFAULT 'default',
  profile_skin varchar(24) NOT NULL DEFAULT 'default',
  owned_skins jsonb NOT NULL DEFAULT '["default"]',
  claimed_achievements jsonb NOT NULL DEFAULT '[]',
  starter_pack_bought boolean NOT NULL DEFAULT false,
  last_daily_login_date varchar(16) NOT NULL DEFAULT '',
  attacks_won integer NOT NULL DEFAULT 0,
  attacks_lost integer NOT NULL DEFAULT 0,
  total_gold_earned bigint NOT NULL DEFAULT 0,
  last_collect timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now(),
  vip_level integer NOT NULL DEFAULT 0
);

CREATE TABLE clans (
  id serial PRIMARY KEY,
  name varchar(48) NOT NULL UNIQUE,
  tag varchar(8) NOT NULL,
  description text NOT NULL DEFAULT '',
  leader_id integer NOT NULL,
  power bigint NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 1,
  war_wins integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  xp bigint NOT NULL DEFAULT 0,
  treasury_gold bigint NOT NULL DEFAULT 0,
  war_points integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE clan_messages (
  id serial PRIMARY KEY,
  clan_id integer NOT NULL,
  player_id integer NOT NULL,
  username varchar(64) NOT NULL,
  message text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE battle_reports (
  id serial PRIMARY KEY,
  attacker_id integer NOT NULL,
  defender_id integer NOT NULL,
  attacker_name varchar(64) NOT NULL,
  defender_name varchar(64) NOT NULL,
  win boolean NOT NULL,
  loot jsonb NOT NULL DEFAULT '{}',
  details text NOT NULL DEFAULT '',
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE market_orders (
  id serial PRIMARY KEY,
  seller_id integer NOT NULL,
  seller_name varchar(64) NOT NULL,
  offer_resource varchar(16) NOT NULL,
  offer_amount integer NOT NULL,
  want_resource varchar(16) NOT NULL,
  want_amount integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE build_queue (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  building varchar(24) NOT NULL,
  to_level integer NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  finish_at timestamp NOT NULL
);

CREATE TABLE train_queue (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  troop varchar(24) NOT NULL,
  quantity integer NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  finish_at timestamp NOT NULL
);

CREATE TABLE world_events (
  id serial PRIMARY KEY,
  type varchar(32) NOT NULL,
  title varchar(128) NOT NULL,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  ends_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE payment_requests (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  username varchar(64) NOT NULL,
  gems integer NOT NULL,
  amount varchar(32) NOT NULL,
  payer_name varchar(64) NOT NULL DEFAULT '',
  ref_code varchar(64) NOT NULL DEFAULT '',
  status varchar(16) NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  reviewed_at timestamp,
  package_type varchar(32),
  is_starter_pack boolean DEFAULT false
);

CREATE TABLE activity_log (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  icon varchar(8) NOT NULL DEFAULT '•',
  text text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE player_missions (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  mission_id varchar(32) NOT NULL,
  kind varchar(8) NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  claimed boolean NOT NULL DEFAULT false,
  period_key varchar(16) NOT NULL
);

CREATE TABLE settings (
  key varchar(48) PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

CREATE TABLE combat_queue (
  id serial PRIMARY KEY,
  attacker_id integer NOT NULL,
  defender_id integer NOT NULL,
  troops jsonb NOT NULL,
  finish_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE announcements (
  id serial PRIMARY KEY,
  title varchar(128) NOT NULL,
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

-- ===================== جداول جدید V2.5 =====================

CREATE TABLE notifications (
  id serial PRIMARY KEY,
  player_id integer,
  title varchar(128) NOT NULL,
  message text NOT NULL,
  type varchar(16) NOT NULL DEFAULT 'info',
  icon varchar(8) NOT NULL DEFAULT '📢',
  read boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE speedup_history (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  type varchar(16) NOT NULL,
  item_id integer NOT NULL,
  minutes_saved integer NOT NULL,
  gems_spent integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE vip_tiers (
  level integer PRIMARY KEY,
  name varchar(32) NOT NULL,
  production_bonus integer NOT NULL,
  build_speed_bonus integer NOT NULL,
  train_speed_bonus integer NOT NULL,
  builder_slots integer NOT NULL,
  monthly_price_gems integer NOT NULL
);

CREATE TABLE active_boosters (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  type varchar(16) NOT NULL,
  multiplier integer NOT NULL,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE referral_milestones (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  milestone integer NOT NULL,
  claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamp,
  UNIQUE(player_id, milestone)
);

CREATE TABLE seasons (
  id serial PRIMARY KEY,
  name varchar(64) NOT NULL,
  description text NOT NULL,
  starts_at timestamp NOT NULL,
  ends_at timestamp NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE seasonal_rewards (
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

CREATE TABLE cosmetic_items (
  id serial PRIMARY KEY,
  type varchar(16) NOT NULL,
  name varchar(64) NOT NULL,
  description text,
  price_gems integer NOT NULL,
  icon varchar(64),
  available boolean NOT NULL DEFAULT true
);

CREATE TABLE player_cosmetics (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  item_id integer NOT NULL,
  purchased_at timestamp NOT NULL DEFAULT now(),
  UNIQUE(player_id, item_id)
);

CREATE TABLE battle_queue (
  id serial PRIMARY KEY,
  attacker_id integer NOT NULL,
  defender_id integer NOT NULL,
  troops jsonb NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  arrives_at timestamp NOT NULL,
  completed boolean NOT NULL DEFAULT false
);

CREATE TABLE shop_packages (
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

-- ===================== ایندکس‌ها =====================

CREATE INDEX idx_notifications_player ON notifications(player_id, read);
CREATE INDEX idx_boosters_player ON active_boosters(player_id, expires_at);
CREATE INDEX idx_battle_queue_attacker ON battle_queue(attacker_id, completed);
CREATE INDEX idx_players_power ON players(power DESC);
CREATE INDEX idx_players_level ON players(level DESC);
CREATE INDEX idx_battle_reports_attacker ON battle_reports(attacker_id, created_at DESC);
CREATE INDEX idx_battle_reports_defender ON battle_reports(defender_id, created_at DESC);
CREATE INDEX idx_build_queue_player ON build_queue(player_id, finish_at);
CREATE INDEX idx_train_queue_player ON train_queue(player_id, finish_at);

-- ===================== داده‌های اولیه =====================

INSERT INTO vip_tiers (level, name, production_bonus, build_speed_bonus, train_speed_bonus, builder_slots, monthly_price_gems) VALUES
(1, 'برنزی', 10, 10, 10, 1, 99),
(2, 'نقره‌ای', 20, 20, 20, 1, 299),
(3, 'طلایی', 30, 30, 30, 2, 699),
(4, 'الماسی', 50, 50, 50, 3, 1499);

INSERT INTO cosmetic_items (type, name, description, price_gems, icon) VALUES
('city_skin', 'قلعه طلایی', 'اسکین طلایی برای شهر شما', 200, '🏰'),
('city_skin', 'قلعه یخی', 'اسکین یخی برای شهر شما', 300, '❄️'),
('city_skin', 'قلعه آتشین', 'اسکین آتشین برای شهر شما', 400, '🔥'),
('profile_frame', 'قاب طلایی', 'قاب طلایی برای پروفایل', 150, '🖼️'),
('profile_frame', 'قاب الماس', 'قاب الماسی برای پروفایل', 500, '💎');

INSERT INTO shop_packages (type, name, description, gems, gold, vip_days, booster_hours, price_irr, one_time_only) VALUES
('starter', 'بسته شروع', '200 جم + 5000 طلا + VIP 1 روزه + بوستر', 200, 5000, 1, 24, 49000, true),
('gems_small', 'بسته کوچک', '100 جم', 100, 0, 0, 0, 59000, false),
('gems_medium', 'بسته متوسط', '500 جم', 500, 0, 0, 0, 249000, false),
('gems_large', 'بسته بزرگ', '1200 جم', 1200, 0, 0, 0, 499000, false);

INSERT INTO settings (key, value) VALUES
('speedup_cost_per_minute', '1'),
('production_booster_price', '50'),
('build_booster_price', '50'),
('train_booster_price', '50'),
('booster_duration_hours', '24'),
('battle_travel_time_seconds', '10'),
('max_battle_history', '20'),
('adminPassword', 'admin1234'),
('paymentCard', '6037-9977-1234-5678'),
('paymentCardHolder', 'نام صاحب حساب'),
('daily1', '100'),
('daily2', '200'),
('daily3', '300'),
('daily4', '500'),
('daily5', '800'),
('daily6', '1200'),
('daily7Gems', '30'),
('inviteGold', '500'),
('inviteGems', '20'),
('inviteGoldNew', '300'),
('inviteGemsNew', '10'),
('inviteDailyLimit', '2'),
('startGold', '500'),
('startFood', '500'),
('startStone', '300'),
('startIron', '200'),
('startGems', '50'),
('gemPack1Price', '99000'),
('gemPack2Price', '399000'),
('gemPack3Price', '699000');

-- ============================================================
-- پایان Setup
-- ============================================================
