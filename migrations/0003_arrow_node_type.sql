-- Expand the nodes type constraint to include arrow and arrow_anchor node types.
-- SQLite does not support ALTER TABLE to modify CHECK constraints, so we recreate the table.

CREATE TABLE nodes_new (
  id        TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  type      TEXT NOT NULL CHECK (type IN ('image', 'website', 'vector', 'sticky_comment', 'arrow', 'arrow_anchor')),
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
