import { Hono } from 'hono'

type Bindings = {
  DB: D1Database
  UPLOADS: R2Bucket
  ANTHROPIC_API_KEY: string
  CF_ACCOUNT_ID: string
  CF_API_TOKEN: string
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

type CommentRow = {
  id: string
  canvas_id: string
  parent_type: string
  parent_id: string | null
  x: number | null
  y: number | null
  original_text: string
  original_lang: string
  en_text: string | null
  ko_text: string | null
  author_email: string
  created_at: string
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
  label?: string | null
}

const app = new Hono<{ Bindings: Bindings }>()

function getEmail(req: Request): string {
  return req.headers.get('Cf-Access-Authenticated-User-Email') ?? 'test@pulsead.io'
}

async function verifyAccess(db: D1Database, canvasId: string, email: string): Promise<boolean> {
  const row = await db.prepare(`
    SELECT 1 FROM canvases c
    LEFT JOIN canvas_members cm ON c.id = cm.canvas_id
    WHERE c.id = ? AND (c.owner_email = ? OR cm.user_email = ?)
    LIMIT 1
  `).bind(canvasId, email, email).first()
  return row !== null
}

// ── Auth ─────────────────────────────────────────────────────────────────────

app.get('/api/me', (c) => c.json({ email: getEmail(c.req.raw) }))

// ── Canvases ─────────────────────────────────────────────────────────────────

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
      label: e.label ?? null,
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
        'INSERT INTO edges (id, canvas_id, source_node_id, target_node_id, label) VALUES (?, ?, ?, ?, ?)'
      ).bind(e.id, canvasId, e.source, e.target, e.label ?? null)
    ),
    c.env.DB.prepare("UPDATE canvases SET updated_at = datetime('now') WHERE id = ?").bind(canvasId),
  ])

  return c.json({ ok: true })
})

// ── Uploads & screenshots ─────────────────────────────────────────────────────

app.post('/api/upload', async (c) => {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  if (!file) return c.json({ error: 'No file provided' }, 400)

  const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin'
  const key = `uploads/${crypto.randomUUID()}.${ext}`

  await c.env.UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })

  return c.json({ url: `/api/images/${key}` })
})

app.post('/api/screenshot', async (c) => {
  const { url } = await c.req.json<{ url: string }>()
  if (!url) return c.json({ error: 'url required' }, 400)

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_ACCOUNT_ID}/browser-rendering/screenshot`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.env.CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, screenshotOptions: { fullPage: false } }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    return c.json({ error: `Browser Rendering failed: ${res.status}`, detail: err }, 502)
  }

  const pngBuffer = await res.arrayBuffer()
  const key = `screenshots/${crypto.randomUUID()}.png`
  await c.env.UPLOADS.put(key, pngBuffer, { httpMetadata: { contentType: 'image/png' } })

  return c.json({ screenshotUrl: `/api/images/${key}` })
})

app.get('/api/images/:key{.+}', async (c) => {
  const key = c.req.param('key')
  const obj = await c.env.UPLOADS.get(key)
  if (!obj) return c.json({ error: 'Not found' }, 404)

  const headers = new Headers()
  if (obj.httpMetadata?.contentType) headers.set('Content-Type', obj.httpMetadata.contentType)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(obj.body, { headers })
})

// ── Comments ──────────────────────────────────────────────────────────────────

app.get('/api/canvases/:id/comments', async (c) => {
  const email = getEmail(c.req.raw)
  const canvasId = c.req.param('id')

  if (!(await verifyAccess(c.env.DB, canvasId, email))) {
    return c.json({ error: 'Not found' }, 404)
  }

  const parentType = c.req.query('parent_type') ?? 'node'
  const parentId = c.req.query('parent_id') ?? ''

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM comments WHERE canvas_id = ? AND parent_type = ? AND parent_id = ? ORDER BY created_at ASC'
  ).bind(canvasId, parentType, parentId).all<CommentRow>()

  return c.json(results)
})

app.post('/api/comments', async (c) => {
  const email = getEmail(c.req.raw)
  const { canvas_id, parent_type, parent_id, text } = await c.req.json<{
    canvas_id: string
    parent_type: string
    parent_id: string
    text: string
  }>()

  if (!(await verifyAccess(c.env.DB, canvas_id, email))) {
    return c.json({ error: 'Not found' }, 404)
  }

  // Detect language by Hangul presence (U+AC00–U+D7A3)
  const hasHangul = /[가-힣]/.test(text)
  const original_lang = hasHangul ? 'ko' : 'en'
  const targetLangLabel = hasHangul ? 'English' : 'Korean'

  let en_text: string | null = null
  let ko_text: string | null = null

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': c.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: `You are translating between English and Korean for a martech and e-commerce team at Pulse Ad. Translate the user's message to ${targetLangLabel}. Preserve technical terms like SKU, ASIN, BSR, Buy Box, ROAS, GMV, CPC, CTR, and brand names in their original form. Keep the tone professional but natural. Return only the translation, no preamble, no quotes.`,
        messages: [{ role: 'user', content: text }],
      }),
    })
    const result = await anthropicRes.json() as { content: Array<{ text: string }> }
    const translation = result.content[0]?.text ?? ''
    en_text = original_lang === 'en' ? text : translation
    ko_text = original_lang === 'ko' ? text : translation
  } catch {
    en_text = original_lang === 'en' ? text : null
    ko_text = original_lang === 'ko' ? text : null
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO comments (id, canvas_id, parent_type, parent_id, original_text, original_lang, en_text, ko_text, author_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, canvas_id, parent_type, parent_id, text, original_lang, en_text, ko_text, email).run()

  return c.json({ id }, 201)
})

export const onRequest: PagesFunction<Bindings> = (ctx) =>
  app.fetch(ctx.request, ctx.env, ctx)
