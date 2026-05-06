import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

type Canvas = {
  id: string
  name: string
  owner_email: string
  created_at: string
  updated_at: string
  role: 'owner' | 'editor' | 'viewer'
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
      const canvas = await res.json() as Canvas
      navigate(`/canvases/${canvas.id}`)
    } finally {
      setCreating(false)
    }
  }, [navigate])

  const owned = canvases.filter((c) => c.role === 'owner')
  const shared = canvases.filter((c) => c.role !== 'owner')

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" opacity="0.9" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" opacity="0.6" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" opacity="0.6" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" opacity="0.3" />
            </svg>
          </div>
          <span className="font-semibold text-gray-100 tracking-tight">Canvas</span>
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
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : canvases.length === 0 ? (
          <EmptyState onCreate={createCanvas} creating={creating} />
        ) : (
          <div className="flex flex-col gap-10">
            {owned.length > 0 && (
              <Section title="My canvases">
                {owned.map((canvas) => (
                  <CanvasCard key={canvas.id} canvas={canvas} onClick={() => navigate(`/canvases/${canvas.id}`)} />
                ))}
              </Section>
            )}
            {shared.length > 0 && (
              <Section title="Shared with me">
                {shared.map((canvas) => (
                  <CanvasCard key={canvas.id} canvas={canvas} showOwner onClick={() => navigate(`/canvases/${canvas.id}`)} />
                ))}
              </Section>
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

function CanvasCard({ canvas, showOwner, onClick }: { canvas: Canvas; showOwner?: boolean; onClick: () => void }) {
  const badge = canvas.role !== 'owner' ? ROLE_BADGE[canvas.role] : null

  return (
    <button
      onClick={onClick}
      className="group text-left bg-gray-900 border border-gray-800 hover:border-indigo-500 rounded-xl p-5 transition-colors cursor-pointer"
    >
      <div className="w-full h-24 rounded-lg bg-gray-800 border border-gray-700 mb-4 flex items-center justify-center">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-600">
          <circle cx="9" cy="9" r="3" />
          <circle cx="17" cy="15" r="3" />
          <path d="M12 9h2M15 15H7" strokeLinecap="round" />
        </svg>
      </div>

      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-100 group-hover:text-indigo-400 transition-colors truncate">
          {canvas.name}
        </h3>
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, color: badge.color, background: badge.bg, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {badge.label}
          </span>
        )}
      </div>

      {showOwner && (
        <p className="text-xs text-gray-600 mb-0.5 truncate">{canvas.owner_email}</p>
      )}
      <p className="text-xs text-gray-500">Updated {formatDate(canvas.updated_at)}</p>
    </button>
  )
}

function EmptyState({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </div>
      <div>
        <p className="text-gray-300 font-medium mb-1">No canvases yet</p>
        <p className="text-gray-600 text-sm">Create your first one to get started.</p>
      </div>
      <button
        onClick={onCreate}
        disabled={creating}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
      >
        {creating ? 'Creating…' : '+ New Canvas'}
      </button>
    </div>
  )
}
