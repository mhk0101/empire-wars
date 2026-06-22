-- ============================================================
-- مهاجرت دیتابیس: افزودن ستون‌ها و جدول‌های جدید به دیتابیس موجود
-- اگر بازی را قبلاً اجرا کرده‌ای و خطای "column ... does not exist" گرفتی،
-- این فایل را اجرا کن:
--   psql -U postgres -d app_db -f migrate.sql
-- امن است و به داده‌های موجود آسیب نمی‌زند.
-- ============================================================

-- ستون‌های جدول players
ALTER TABLE players ADD COLUMN IF NOT EXISTS xp bigint NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS name_chosen boolean NOT NULL DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;
ALTER TABLE players ADD COLUMN IF NOT EXISTS device_token varchar(64);
ALTER TABLE players ADD COLUMN IF NOT EXISTS clan_role varchar(16) NOT NULL DEFAULT 'member';
ALTER TABLE players ADD COLUMN IF NOT EXISTS daily_invites integer NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_invite_date varchar(16) NOT NULL DEFAULT '';
ALTER TABLE players ADD COLUMN IF NOT EXISTS city_skin varchar(24) NOT NULL DEFAULT 'default';
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_skin varchar(24) NOT NULL DEFAULT 'default';
ALTER TABLE players ADD COLUMN IF NOT EXISTS owned_skins jsonb NOT NULL DEFAULT '["default"]';

-- یکتا بودن device_token
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'players_device_token_unique') THEN
    BEGIN
      ALTER TABLE players ADD CONSTRAINT players_device_token_unique UNIQUE (device_token);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
END $$;

-- ستون‌های جدول clans
ALTER TABLE clans ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS xp bigint NOT NULL DEFAULT 0;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS treasury_gold bigint NOT NULL DEFAULT 0;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS war_points integer NOT NULL DEFAULT 0;

-- ستون world_events
ALTER TABLE world_events ADD COLUMN IF NOT EXISTS ends_at timestamp;

-- جدول‌های جدید
CREATE TABLE IF NOT EXISTS build_queue (
  id serial PRIMARY KEY, player_id integer NOT NULL, building varchar(24) NOT NULL,
  to_level integer NOT NULL, started_at timestamp NOT NULL DEFAULT now(), finish_at timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS train_queue (
  id serial PRIMARY KEY, player_id integer NOT NULL, troop varchar(24) NOT NULL,
  quantity integer NOT NULL, started_at timestamp NOT NULL DEFAULT now(), finish_at timestamp NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_requests (
  id serial PRIMARY KEY, player_id integer NOT NULL, username varchar(64) NOT NULL,
  gems integer NOT NULL, amount varchar(32) NOT NULL, payer_name varchar(64) NOT NULL DEFAULT '',
  ref_code varchar(64) NOT NULL DEFAULT '', status varchar(16) NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(), reviewed_at timestamp
);
CREATE TABLE IF NOT EXISTS activity_log (
  id serial PRIMARY KEY, player_id integer NOT NULL, icon varchar(8) NOT NULL DEFAULT '•',
  text text NOT NULL, created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS player_missions (
  id serial PRIMARY KEY, player_id integer NOT NULL, mission_id varchar(32) NOT NULL,
  kind varchar(8) NOT NULL, progress integer NOT NULL DEFAULT 0,
  claimed boolean NOT NULL DEFAULT false, period_key varchar(16) NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key varchar(48) PRIMARY KEY, value text NOT NULL DEFAULT ''
);

-- پایان مهاجرت ✅
