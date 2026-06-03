import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrashIcon } from '../components/icons'

type Canvas = {
  id: string
  name: string
  owner_email: string
  created_at: string
  updated_at: string
  role: 'owner' | 'editor' | 'viewer'
  thumbnail_data: string | null
}

type ThumbnailNode = { t: string; x: number; y: number; c: string; w: number; h: number }

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function extractTags(name: string): string[] {
  return (name.match(/#[\w가-힣]+/g) ?? []).map((t) => t.toLowerCase())
}

function displayName(name: string) {
  return name.replace(/#[\w가-힣]+/g, '').trim() || name
}

const ROLE_BADGE: Record<'editor' | 'viewer', { label: string; color: string; bg: string }> = {
  editor: { label: 'Editor', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  viewer: { label: 'Viewer', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

export function CanvasList() {
  const navigate = useNavigate()
  const [canvases, setCanvases] = useState<Canvas[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then((r) => r.json() as Promise<{ email: string }>),
      fetch('/api/canvases').then((r) => r.json() as Promise<Canvas[]>),
    ]).then(([me, list]) => {
      setEmail(me.email)
      setCanvases(list)
      setLoading(false)
    })
  }, [])

  const createCanvas = useCallback(async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/canvases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Canvas' }),
      })
      if (!res.ok) return
      const canvas = await res.json() as Canvas
      navigate(`/canvas/${canvas.id}`)
    } finally {
      setCreating(false)
    }
  }, [navigate])

  const deleteCanvas = useCallback(async (id: string) => {
    const res = await fetch(`/api/canvases/${id}`, { method: 'DELETE' })
    if (!res.ok) { setConfirming(null); return }
    setCanvases((cs) => cs.filter((c) => c.id !== id))
    setConfirming(null)
  }, [])

  const renameCanvas = useCallback((id: string, newName: string) => {
    setCanvases((cs) => cs.map((c) => c.id === id ? { ...c, name: newName } : c))
  }, [])

  const owned = canvases.filter((c) => c.role === 'owner')
  const shared = canvases.filter((c) => c.role !== 'owner')

  const allTags = useMemo(
    () => Array.from(new Set(canvases.flatMap((c) => extractTags(c.name)))).sort(),
    [canvases],
  )

  // Groups of 2+ canvases sharing a hashtag
  const tagGroups = useMemo(() => {
    const groups: Record<string, Canvas[]> = {}
    canvases.forEach((c) => {
      extractTags(c.name).forEach((tag) => {
        if (!groups[tag]) groups[tag] = []
        groups[tag].push(c)
      })
    })
    return Object.entries(groups).filter(([, cs]) => cs.length >= 2)
  }, [canvases])

  const filteredOwned = activeTag ? owned.filter((c) => extractTags(c.name).includes(activeTag)) : owned
  const filteredShared = activeTag ? shared.filter((c) => extractTags(c.name).includes(activeTag)) : shared

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.6" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.6" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" opacity="0.3" />
            </svg>
          </div>
          <span className="font-semibold text-gray-100 tracking-tight">Pulse Ad Canvas</span>
        </div>
        <div className="flex items-center gap-4">
          {email && <span className="text-xs text-gray-500 hidden sm:block">{email}</span>}
          <button
            onClick={createCanvas}
            disabled={creating}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            {creating ? 'Creating…' : '+ New Canvas'}
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="px-6 py-8 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex flex-col gap-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="m-3 h-24 rounded-lg skeleton" />
                  <div className="p-4 pt-1 flex flex-col gap-2">
                    <div className="h-4 rounded skeleton" style={{ width: `${60 + i * 12}%` }} />
                    <div className="h-3 rounded skeleton" style={{ width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : canvases.length === 0 ? (
          <EmptyState onCreate={createCanvas} creating={creating} />
        ) : (
          <div className="flex flex-col gap-10">
            {/* Tag filter pills */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                      activeTag === tag
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-transparent border-gray-700 text-gray-400 hover:border-indigo-500 hover:text-indigo-400'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {filteredOwned.length > 0 && (
              <Section title="My Work">
                {filteredOwned.map((canvas) => (
                  <CanvasCard
                    key={canvas.id}
                    canvas={canvas}
                    confirming={confirming === canvas.id}
                    onOpen={() => navigate(`/canvas/${canvas.id}`)}
                    onDeleteRequest={() => setConfirming(canvas.id)}
                    onDeleteConfirm={() => deleteCanvas(canvas.id)}
                    onDeleteCancel={() => setConfirming(null)}
                    onRename={renameCanvas}
                  />
                ))}
              </Section>
            )}

            {filteredShared.length > 0 && (
              <Section title="Shared with me">
                {filteredShared.map((canvas) => (
                  <CanvasCard
                    key={canvas.id}
                    canvas={canvas}
                    showOwner
                    confirming={false}
                    onOpen={() => navigate(`/canvas/${canvas.id}`)}
                    onDeleteRequest={() => {}}
                    onDeleteConfirm={() => {}}
                    onDeleteCancel={() => {}}
                    onRename={renameCanvas}
                  />
                ))}
              </Section>
            )}

            {/* Hashtag group sections (2+ canvases per tag) */}
            {!activeTag && tagGroups.map(([tag, tagCanvases]) => (
              <Section key={tag} title={tag}>
                {tagCanvases.map((canvas) => (
                  <CanvasCard
                    key={canvas.id}
                    canvas={canvas}
                    showOwner={canvas.role !== 'owner'}
                    confirming={confirming === canvas.id}
                    onOpen={() => navigate(`/canvas/${canvas.id}`)}
                    onDeleteRequest={() => canvas.role === 'owner' ? setConfirming(canvas.id) : undefined}
                    onDeleteConfirm={() => deleteCanvas(canvas.id)}
                    onDeleteCancel={() => setConfirming(null)}
                    onRename={renameCanvas}
                  />
                ))}
              </Section>
            ))}

            {activeTag && filteredOwned.length === 0 && filteredShared.length === 0 && (
              <p className="text-gray-500 text-sm">Nothing tagged {activeTag}.</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
    </div>
  )
}

function CanvasThumbnail({ data }: { data: string | null }) {
  let nodes: ThumbnailNode[] = []
  try { if (data) nodes = JSON.parse(data) as ThumbnailNode[] } catch { /**/ }

  if (!nodes.length) {
    return (
      <div className="w-full h-24 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-700">
          <circle cx="9" cy="9" r="3" /><circle cx="17" cy="15" r="3" />
          <path d="M12 9h2M15 15H7" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  return (
    <div className="w-full h-24 rounded-lg bg-gray-900 border border-gray-700 overflow-hidden">
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
        <rect width="100" height="100" fill="#111827" />
        {nodes.map((n, i) => (
          <rect key={i} x={n.x} y={n.y} width={Math.max(n.w, 8)} height={Math.max(n.h, 5)} rx="2" fill={n.c} opacity="0.8" />
        ))}
      </svg>
    </div>
  )
}

function CanvasCard({
  canvas, showOwner, confirming, onOpen, onDeleteRequest, onDeleteConfirm, onDeleteCancel, onRename,
}: {
  canvas: Canvas; showOwner?: boolean; confirming: boolean
  onOpen: () => void; onDeleteRequest: () => void; onDeleteConfirm: () => void; onDeleteCancel: () => void
  onRename: (id: string, newName: string) => void
}) {
  const badge = canvas.role !== 'owner' ? ROLE_BADGE[canvas.role] : null
  const tags = extractTags(canvas.name)
  const name = displayName(canvas.name)

  const [hovered, setHovered] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const raw = tagInput.trim().replace(/^#/, '')
    if (!raw) { setAddingTag(false); return }
    const newName = `${canvas.name} #${raw}`
    setTagInput('')
    setAddingTag(false)
    onRename(canvas.id, newName)
    await fetch(`/api/canvases/${canvas.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
  }

  if (confirming) {
    return (
      <div className="bg-gray-900 border border-red-900 rounded-xl p-5 flex flex-col justify-between min-h-[200px]">
        <div>
          <p className="font-semibold text-gray-100 mb-1 truncate">{name}</p>
          <p className="text-sm text-red-400 mt-2">Delete this canvas? This cannot be undone.</p>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onDeleteCancel} className="flex-1 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors cursor-pointer">Cancel</button>
          <button onClick={onDeleteConfirm} className="flex-1 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 transition-colors cursor-pointer">Delete</button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="group bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl overflow-hidden"
      style={{ transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={(e) => {
        setHovered(true)
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'
      }}
      onMouseLeave={(e) => {
        setHovered(false)
        setAddingTag(false)
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      {/* Thumbnail */}
      <button onClick={onOpen} className="block w-full p-3 pb-0 cursor-pointer">
        <CanvasThumbnail data={canvas.thumbnail_data} />
      </button>

      {/* Info */}
      <div className="p-4 pt-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <button onClick={onOpen} className="font-semibold text-gray-100 hover:text-indigo-400 transition-colors text-left truncate cursor-pointer text-sm leading-snug">
            {name}
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            {badge && (
              <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, padding: '2px 6px', borderRadius: 999 }}>
                {badge.label}
              </span>
            )}
            {canvas.role === 'owner' && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteRequest() }}
                title="Delete canvas"
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-600 hover:text-red-400 cursor-pointer"
              >
                <TrashIcon size={13} />
              </button>
            )}
          </div>
        </div>

        {showOwner && <p className="text-xs text-gray-600 truncate mb-0.5">{canvas.owner_email}</p>}
        <p className="text-xs text-gray-600">{formatDateTime(canvas.updated_at)}</p>

        {/* Existing hashtag pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <span key={tag} className="text-xs text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {/* Hover: add hashtag input */}
        {hovered && canvas.role === 'owner' && (
          <div className="mt-2">
            {!addingTag ? (
              <button
                onClick={(e) => { e.stopPropagation(); setAddingTag(true); setTimeout(() => tagInputRef.current?.focus(), 50) }}
                className="text-xs text-gray-600 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                + add hashtag
              </button>
            ) : (
              <form onSubmit={handleAddTag} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span className="text-xs text-indigo-400">#</span>
                <input
                  ref={tagInputRef}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setAddingTag(false); setTagInput('') } }}
                  placeholder="tag name"
                  className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-indigo-300 outline-none focus:border-indigo-500 flex-1"
                  autoFocus
                />
                <button type="submit" className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">↵</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <div>
        <p className="text-gray-300 font-medium mb-1">Nothing here yet</p>
        <p className="text-gray-600 text-sm">Create your first one to get started.</p>
      </div>
      <button onClick={onCreate} disabled={creating} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors cursor-pointer">
        {creating ? 'Creating…' : '+ New Canvas'}
      </button>
    </div>
  )
}
