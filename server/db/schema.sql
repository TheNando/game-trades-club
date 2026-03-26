PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  year INTEGER,
  is_expansion INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT,
  game_id INTEGER NOT NULL,
  condition TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- CREATE TABLE IF NOT EXISTS offers (
--   id TEXT PRIMARY KEY,
--   user_id TEXT NOT NULL,
--   trade_id TEXT,
--   message TEXT,
--   price INTEGER,
--   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
--   FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE SET NULL
-- );

-- CREATE TABLE IF NOT EXISTS wishlist_items (
--   id TEXT PRIMARY KEY,
--   user_id TEXT NOT NULL,
--   game_title TEXT NOT NULL,
--   platform TEXT,
--   notes TEXT,
--   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_game_id ON listings(game_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_owner_id ON listing_images(owner_id);

-- CREATE INDEX IF NOT EXISTS idx_offers_user_id ON offers(user_id);
-- CREATE INDEX IF NOT EXISTS idx_offers_trade_id ON offers(trade_id);

-- CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON wishlist_items(user_id);
