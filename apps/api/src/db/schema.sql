PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS publishers (
  id INTEGER PRIMARY KEY,
  bgg_id INTEGER,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS designers (
  id INTEGER PRIMARY KEY,
  bgg_id INTEGER,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS artists (
  id INTEGER PRIMARY KEY,
  bgg_id INTEGER,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  bgg_id INTEGER,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS mechanics (
  id INTEGER PRIMARY KEY,
  bgg_id INTEGER,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS game_publishers (
  game_id INTEGER NOT NULL,
  publisher_id INTEGER NOT NULL,
  PRIMARY KEY (game_id, publisher_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_designers (
  game_id INTEGER NOT NULL,
  designer_id INTEGER NOT NULL,
  PRIMARY KEY (game_id, designer_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (designer_id) REFERENCES designers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_artists (
  game_id INTEGER NOT NULL,
  artist_id INTEGER NOT NULL,
  PRIMARY KEY (game_id, artist_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_categories (
  game_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (game_id, category_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS game_mechanics (
  game_id INTEGER NOT NULL,
  mechanic_id INTEGER NOT NULL,
  PRIMARY KEY (game_id, mechanic_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (mechanic_id) REFERENCES mechanics(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT,
  game_id INTEGER NOT NULL,
  condition TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  preferred_shop_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE RESTRICT,
  FOREIGN KEY (preferred_shop_id) REFERENCES shops(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  zip TEXT,
  address TEXT,
  website_url TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  thumb_stored_filename TEXT,
  width INTEGER,
  height INTEGER,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_publishers_bgg_id ON publishers(bgg_id) WHERE bgg_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_designers_bgg_id ON designers(bgg_id) WHERE bgg_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_bgg_id ON artists(bgg_id) WHERE bgg_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_bgg_id ON categories(bgg_id) WHERE bgg_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mechanics_bgg_id ON mechanics(bgg_id) WHERE bgg_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_publishers_publisher_id ON game_publishers(publisher_id);
CREATE INDEX IF NOT EXISTS idx_game_designers_designer_id ON game_designers(designer_id);
CREATE INDEX IF NOT EXISTS idx_game_artists_artist_id ON game_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_game_categories_category_id ON game_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_game_mechanics_mechanic_id ON game_mechanics(mechanic_id);

CREATE INDEX IF NOT EXISTS idx_shops_city ON shops(city);
CREATE INDEX IF NOT EXISTS idx_shops_name ON shops(name);

CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_game_id ON listings(game_id);
CREATE INDEX IF NOT EXISTS idx_listings_preferred_shop_id ON listings(preferred_shop_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_owner_id ON listing_images(owner_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_created ON listing_images(listing_id, created_at, id);
