-- Add 'text' node type to the nodes type constraint (SQLite requires table recreation)
CREATE TABLE nodes_new (
  id        TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('image','website','vector','sticky_comment','arrow','arrow_anchor','text')),
  x         REAL NOT NULL DEFAULT 0,
  y         REAL NOT NULL DEFAULT 0,
  width     REAL,
  height    REAL,
  data      TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO nodes_new SELECT * FROM nodes;
DROP TABLE nodes;
ALTER TABLE nodes_new RENAME TO nodes;
CREATE INDEX IF NOT EXISTS idx_nodes_canvas ON nodes(canvas_id);

-- Add handle + type + data columns to edges (SQLite supports ADD COLUMN directly)
ALTER TABLE edges ADD COLUMN source_handle TEXT;
ALTER TABLE edges ADD COLUMN target_handle TEXT;
ALTER TABLE edges ADD COLUMN type TEXT NOT NULL DEFAULT 'arrow';
ALTER TABLE edges ADD COLUMN data TEXT NOT NULL DEFAULT '{}';
