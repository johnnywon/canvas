CREATE TABLE IF NOT EXISTS canvases (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS canvas_members (
  canvas_id  TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  PRIMARY KEY (canvas_id, user_email)
);

CREATE TABLE IF NOT EXISTS nodes (
  id        TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('image', 'website', 'vector', 'sticky_comment')),
  x         REAL NOT NULL DEFAULT 0,
  y         REAL NOT NULL DEFAULT 0,
  width     REAL,
  height    REAL,
  data      TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS edges (
  id             TEXT PRIMARY KEY,
  canvas_id      TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  label          TEXT
);

CREATE TABLE IF NOT EXISTS comments (
  id            TEXT PRIMARY KEY,
  canvas_id     TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  parent_type   TEXT NOT NULL CHECK (parent_type IN ('node', 'edge', 'canvas_freefloat')),
  parent_id     TEXT,
  x             REAL,
  y             REAL,
  original_text TEXT NOT NULL,
  original_lang TEXT NOT NULL CHECK (original_lang IN ('en', 'ko')),
  en_text       TEXT,
  ko_text       TEXT,
  author_email  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nodes_canvas     ON nodes(canvas_id);
CREATE INDEX IF NOT EXISTS idx_edges_canvas     ON edges(canvas_id);
CREATE INDEX IF NOT EXISTS idx_comments_canvas  ON comments(canvas_id);
CREATE INDEX IF NOT EXISTS idx_members_canvas   ON canvas_members(canvas_id);
CREATE INDEX IF NOT EXISTS idx_members_email    ON canvas_members(user_email);
CREATE INDEX IF NOT EXISTS idx_canvases_owner   ON canvases(owner_email);
