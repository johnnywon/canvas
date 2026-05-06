import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
}

type NodeRow = {
  id: string
  canvas_id: string
  type: string
  x: number
  y: number
  width: number | null
  height: number | null
  data: string
}

type EdgeRow = {
  id: string
  canvas_id: string
  source_node_id: string
  target_node_id: string
  label: string | null
}

type SaveNode = {
  id: string
  type: string
  x: number
  y: number
  width: number | null
  height: number | null
  data: unknown
}

type SaveEdge = {
  id: string
  source: string
  target: string
}

const app = new Hono<{ Bindings: Bindings }>()

function getEmail(req: Request): string {
  return req.headers.get('Cf-Access-Authenticated-User-Email') ?? 'test@pulsead.io'
}

app.get('/api/me', (c) => {
  return c.json({ email: getEmail(c.req.raw) })
})

app.get('/api/canvases', async (c) => {
  const email = getEmail(c.req.raw)
  const { results } = await c.env.DB.prepare(`
    SELECT DISTINCT c.id, c.name, c.owner_email, c.created_at, c.updated_at
    FROM canvases c
    LEFT JOIN canvas_members cm ON c.id = cm.canvas_id
    WHERE c.owner_email = ? OR cm.user_email = ?
    ORDER BY c.updated_at DESC
  `).bind(email, email).all()
  return c.json(results)
})

app.post('/api/canvases', async (c) => {
  const email = getEmail(c.req.raw)
  const body = await c.req.json<{ name?: string }>()
  const id = crypto.randomUUID()
  const name = body.name?.trim() || 'Untitled Canvas'
  await c.env.DB.prepare(
    'INSERT INTO canvases (id, name, owner_email) VALUES (?, ?, ?)'
  ).bind(id, name, email).run()
  return c.json({ id, name, owner_email: email, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, 201)
})

app.get('/api/canvases/:id', async (c) => {
  const email = getEmail(c.req.raw)
  const canvasId = c.req.param('id')

  const canvas = await c.env.DB.prepare(`
    SELECT DISTINCT c.id, c.name, c.owner_email, c.created_at, c.updated_at
    FROM canvases c
    LEFT JOIN canvas_members cm ON c.id = cm.canvas_id
    WHERE c.id = ? AND (c.owner_email = ? OR cm.user_email = ?)
  `).bind(canvasId, email, email).first()

  if (!canvas) return c.json({ error: 'Not found' }, 404)

  const [nodesRes, edgesRes] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM nodes WHERE canvas_id = ?').bind(canvasId).all<NodeRow>(),
    c.env.DB.prepare('SELECT * FROM edges WHERE canvas_id = ?').bind(canvasId).all<EdgeRow>(),
  ])

  return c.json({
    canvas,
    nodes: nodesRes.results,
    edges: edgesRes.results.map((e) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
    })),
  })
})

app.patch('/api/canvases/:id/state', async (c) => {
  const email = getEmail(c.req.raw)
  const canvasId = c.req.param('id')

  const access = await c.env.DB.prepare(`
    SELECT 1 FROM canvases c
    LEFT JOIN canvas_members cm ON c.id = cm.canvas_id AND cm.user_email = ? AND cm.role = 'editor'
    WHERE c.id = ? AND (c.owner_email = ? OR cm.user_email IS NOT NULL)
    LIMIT 1
  `).bind(email, canvasId, email).first()

  if (!access) return c.json({ error: 'Not found' }, 404)

  const { nodes, edges } = await c.req.json<{ nodes: SaveNode[]; edges: SaveEdge[] }>()

  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM nodes WHERE canvas_id = ?').bind(canvasId),
    c.env.DB.prepare('DELETE FROM edges WHERE canvas_id = ?').bind(canvasId),
    ...nodes.map((n) =>
      c.env.DB.prepare(
        'INSERT INTO nodes (id, canvas_id, type, x, y, width, height, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(n.id, canvasId, n.type, n.x, n.y, n.width ?? null, n.height ?? null, JSON.stringify(n.data))
    ),
    ...edges.map((e) =>
      c.env.DB.prepare(
        'INSERT INTO edges (id, canvas_id, source_node_id, target_node_id) VALUES (?, ?, ?, ?)'
      ).bind(e.id, canvasId, e.source, e.target)
    ),
    c.env.DB.prepare("UPDATE canvases SET updated_at = datetime('now') WHERE id = ?").bind(canvasId),
  ])

  return c.json({ ok: true })
})

app.post('/api/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin'
  const key = `${crypto.randomUUID()}.${ext}`

  await c.env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })

  return c.json({ url: `/api/images/${key}` })
})

app.get('/api/images/:key', async (c) => {
  const key = c.req.param('key')
  const obj = await c.env.IMAGES.get(key)
  if (!obj) return c.json({ error: 'Not found' }, 404)

  const headers = new Headers()
  if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(obj.body, { headers })
})

export const onRequest: PagesFunction<Bindings> = (ctx) =>
  app.fetch(ctx.request, ctx.env, ctx)
