-- 5enses Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100),
  avatar_url    TEXT,
  bio           TEXT,
  location      VARCHAR(100),
  is_verified   BOOLEAN DEFAULT FALSE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- ─────────────────────────────────────────
-- BUSINESSES
-- ─────────────────────────────────────────
CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE businesses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  description     TEXT,
  category_id     INT REFERENCES categories(id),
  address         TEXT,
  city            VARCHAR(100),
  state           VARCHAR(50),
  zip             VARCHAR(20),
  latitude        DECIMAL(9,6),
  longitude       DECIMAL(9,6),
  phone           VARCHAR(30),
  website         VARCHAR(255),
  hours           JSONB,             -- { mon: "9am-5pm", tue: "9am-5pm", ... }
  cover_image_url TEXT,
  images          TEXT[],
  price_range     SMALLINT CHECK (price_range BETWEEN 1 AND 4),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_city ON businesses(city);
CREATE INDEX idx_businesses_name_trgm ON businesses USING GIN (name gin_trgm_ops);

-- ─────────────────────────────────────────
-- SENSORY RATINGS
-- ─────────────────────────────────────────
CREATE TABLE ratings (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- 5 senses scores (1-5 each)
  sight        SMALLINT CHECK (sight BETWEEN 1 AND 5),
  sound        SMALLINT CHECK (sound BETWEEN 1 AND 5),
  smell        SMALLINT CHECK (smell BETWEEN 1 AND 5),
  taste        SMALLINT CHECK (taste BETWEEN 1 AND 5),
  touch        SMALLINT CHECK (touch BETWEEN 1 AND 5),
  -- derived overall (avg of provided senses)
  overall      DECIMAL(3,2),
  review_text  TEXT,
  visit_date   DATE,
  images       TEXT[],
  helpful_count INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX idx_ratings_business ON ratings(business_id);
CREATE INDEX idx_ratings_user ON ratings(user_id);
CREATE INDEX idx_ratings_overall ON ratings(overall DESC);

-- helpful votes on ratings
CREATE TABLE rating_helpful (
  user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  rating_id UUID REFERENCES ratings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, rating_id)
);

-- ─────────────────────────────────────────
-- COMMUNITIES & GROUPS
-- ─────────────────────────────────────────
CREATE TABLE communities (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  icon        TEXT,
  member_count INT DEFAULT 0,
  is_public   BOOLEAN DEFAULT TRUE,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_members (
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  role         VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (community_id, user_id)
);

CREATE TABLE groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  slug         VARCHAR(100) NOT NULL,
  description  TEXT,
  cover_image  TEXT,
  member_count INT DEFAULT 0,
  is_private   BOOLEAN DEFAULT FALSE,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, slug)
);

CREATE TABLE group_members (
  group_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ─────────────────────────────────────────
-- POSTS
-- ─────────────────────────────────────────
CREATE TYPE post_type AS ENUM ('text', 'image', 'link', 'rating_share', 'poll');

CREATE TABLE posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  group_id     UUID REFERENCES groups(id) ON DELETE SET NULL,
  post_type    post_type DEFAULT 'text',
  title        VARCHAR(300),
  body         TEXT,
  images       TEXT[],
  link_url     TEXT,
  link_preview JSONB,  -- { title, description, image, url }
  rating_id    UUID REFERENCES ratings(id) ON DELETE SET NULL,
  like_count   INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  share_count  INT DEFAULT 0,
  is_pinned    BOOLEAN DEFAULT FALSE,
  is_deleted   BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_community ON posts(community_id);
CREATE INDEX idx_posts_group ON posts(group_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

CREATE TABLE post_likes (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES comments(id) ON DELETE CASCADE, -- for threading
  body       TEXT NOT NULL,
  like_count INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);

CREATE TABLE comment_likes (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, comment_id)
);

-- ─────────────────────────────────────────
-- FOLLOWS
-- ─────────────────────────────────────────
CREATE TABLE follows (
  follower_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
CREATE TYPE notification_type AS ENUM (
  'new_follower', 'post_like', 'comment', 'comment_like',
  'rating_helpful', 'group_invite', 'community_invite',
  'mention', 'new_post_in_group'
);

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type         notification_type NOT NULL,
  entity_id    UUID,   -- post_id, comment_id, etc.
  entity_type  VARCHAR(50),
  message      TEXT,
  is_read      BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read, created_at DESC);

-- ─────────────────────────────────────────
-- SAVED / BOOKMARKS
-- ─────────────────────────────────────────
CREATE TABLE saved_businesses (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, business_id)
);

CREATE TABLE saved_posts (
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
  saved_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- ─────────────────────────────────────────
-- MEDIA
-- ─────────────────────────────────────────
CREATE TABLE media (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_id UUID REFERENCES users(id),
  url         TEXT NOT NULL,
  mime_type   VARCHAR(100),
  size_bytes  INT,
  width       INT,
  height      INT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- SEED CATEGORIES
-- ─────────────────────────────────────────
INSERT INTO categories (name, icon, slug) VALUES
  ('Restaurants', '🍽️', 'restaurants'),
  ('Cafés', '☕', 'cafes'),
  ('Bars & Nightlife', '🍸', 'bars-nightlife'),
  ('Spas & Wellness', '🧖', 'spas-wellness'),
  ('Music Venues', '🎵', 'music-venues'),
  ('Art Galleries', '🎨', 'art-galleries'),
  ('Parks & Nature', '🌿', 'parks-nature'),
  ('Shopping', '🛍️', 'shopping'),
  ('Fitness', '💪', 'fitness'),
  ('Entertainment', '🎭', 'entertainment');

-- ─────────────────────────────────────────
-- TRIGGERS: updated_at
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ratings_updated_at BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────
-- VIEWS: business rating summaries
-- ─────────────────────────────────────────
CREATE VIEW business_rating_summary AS
SELECT
  business_id,
  COUNT(*)             AS rating_count,
  ROUND(AVG(overall), 2)  AS avg_overall,
  ROUND(AVG(sight), 2) AS avg_sight,
  ROUND(AVG(sound), 2) AS avg_sound,
  ROUND(AVG(smell), 2) AS avg_smell,
  ROUND(AVG(taste), 2) AS avg_taste,
  ROUND(AVG(touch), 2) AS avg_touch
FROM ratings
GROUP BY business_id;
