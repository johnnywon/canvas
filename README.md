# Canvas — Pulse Ad UX Flow Tool

A collaborative UX flow documentation canvas for Pulse Ad's bilingual team.

**Stack:** Vite + React + TypeScript + @xyflow/react · Cloudflare Pages · Cloudflare Workers (via Pages Functions) · D1 (SQLite) · R2 (image storage) · Cloudflare Access (auth)

---

## First-time setup

### 1. Create the D1 database

```bash
wrangler d1 create pulson-canvas-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "pulson-canvas-db"
database_id = "PASTE-ID-HERE"   # ← replace this line
```

### 2. Create the R2 bucket

```bash
wrangler r2 bucket create pulson-canvas-images
```

### 3. Apply migrations (local dev)

```bash
npm run migrations:local
```

### 4. Apply migrations (production — run once after first deploy)

```bash
npm run migrations:remote
```

---

## Development

Run both the Vite dev server and the Cloudflare Worker together:

```bash
npm run dev:all
```

Then open **http://localhost:8788** in your browser.

> The app is served by wrangler on port 8788, which proxies non-API requests to Vite on port 5173.
> All `/api/*` calls are handled by the Pages Function at `functions/api/[[path]].ts`.

### Auth in local dev

Cloudflare Access is not active locally. The Worker reads the `Cf-Access-Authenticated-User-Email` header, which won't be present. It falls back to `test@pulsead.io` so you can develop without any auth setup.

---

## Deployment

The repo is connected to Cloudflare Pages and deploys automatically on push to `master`.

For a manual deploy:

```bash
npm run deploy
```

---

## Project structure

```
pulson-canvas/
├── functions/
│   └── api/
│       └── [[path]].ts   # All /api/* routes (Cloudflare Pages Function)
├── migrations/
│   └── 0001_initial.sql  # D1 schema — run with wrangler d1 migrations apply
├── src/
│   ├── pages/
│   │   ├── CanvasList.tsx    # /canvases — list + create
│   │   └── CanvasEditor.tsx  # /canvases/:id — React Flow editor
│   ├── nodes/
│   │   ├── VectorNode.tsx    # Rounded rectangle with editable label
│   │   └── ImageNode.tsx     # Drag-drop / paste image upload
│   ├── App.tsx               # React Router setup
│   └── main.tsx
├── wrangler.toml             # Cloudflare config (D1 + R2 bindings)
└── SETUP_CLOUDFLARE_ACCESS.md
```

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Returns `{ email }` from CF Access header |
| GET | `/api/canvases` | List canvases the user owns or is a member of |
| POST | `/api/canvases` | Create canvas; body: `{ name?: string }` |
| GET | `/api/canvases/:id` | Canvas + all nodes + edges |
| PATCH | `/api/canvases/:id/state` | Replace all nodes + edges (auto-save target) |
| POST | `/api/upload` | Upload image to R2; returns `{ url }` |
| GET | `/api/images/:key` | Serve image from R2 |

---

## Phase roadmap

| Phase | Status | Scope |
|-------|--------|-------|
| 1 | ✅ Done | Canvas list, editor, ImageNode, VectorNode, D1/R2/Workers setup |
| 2 | Planned | Website/iframe nodes, edge labels, comments, translation (EN↔KO) |
| 3 | Planned | Member invite UI, real-time collaboration |
