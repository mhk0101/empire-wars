-- ============================================================
-- اسکریپت ساخت جدول‌های بازی Empire Wars
-- اگر "npx drizzle-kit push" کار نکرد، این فایل را اجرا کن:
--   psql -U postgres -d app_db -f setup.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS players (
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
  attacks_won integer NOT NULL DEFAULT 0,
  attacks_lost integer NOT NULL DEFAULT 0,
  total_gold_earned bigint NOT NULL DEFAULT 0,
  last_collect timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clans (
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

CREATE TABLE IF NOT EXISTS clan_messages (
  id serial PRIMARY KEY,
  clan_id integer NOT NULL,
  player_id integer NOT NULL,
  username varchar(64) NOT NULL,
  message text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS battle_reports (
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

CREATE TABLE IF NOT EXISTS market_orders (
  id serial PRIMARY KEY,
  seller_id integer NOT NULL,
  seller_name varchar(64) NOT NULL,
  offer_resource varchar(16) NOT NULL,
  offer_amount integer NOT NULL,
  want_resource varchar(16) NOT NULL,
  want_amount integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS build_queue (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  building varchar(24) NOT NULL,
  to_level integer NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  finish_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS train_queue (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  troop varchar(24) NOT NULL,
  quantity integer NOT NULL,
  started_at timestamp NOT NULL DEFAULT now(),
  finish_at timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS world_events (
  id serial PRIMARY KEY,
  type varchar(32) NOT NULL,
  title varchar(128) NOT NULL,
  description text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  ends_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_requests (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  username varchar(64) NOT NULL,
  gems integer NOT NULL,
  amount varchar(32) NOT NULL,
  payer_name varchar(64) NOT NULL DEFAULT '',
  ref_code varchar(64) NOT NULL DEFAULT '',
  status varchar(16) NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  reviewed_at timestamp
);

CREATE TABLE IF NOT EXISTS activity_log (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  icon varchar(8) NOT NULL DEFAULT '•',
  text text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_missions (
  id serial PRIMARY KEY,
  player_id integer NOT NULL,
  mission_id varchar(32) NOT NULL,
  kind varchar(8) NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  claimed boolean NOT NULL DEFAULT false,
  period_key varchar(16) NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key varchar(48) PRIMARY KEY,
  value text NOT NULL DEFAULT ''
);

-- صف نبرد (حملات زمان‌دار)
CREATE TABLE IF NOT EXISTS combat_queue (
  id serial PRIMARY KEY,
  attacker_id integer NOT NULL,
  defender_id integer NOT NULL,
  troops jsonb NOT NULL,
  finish_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id serial PRIMARY KEY,
  title varchar(128) NOT NULL,
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);
