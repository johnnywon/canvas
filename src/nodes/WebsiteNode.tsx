import { useContext, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { CommentIcon } from '../components/icons'

export type WebsiteNodeData = {
  url?: string
  embed_status?: 'pending' | 'live' | 'screenshot'
  screenshot_url?: string
}

export function WebsiteNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const { openThread } = useContext(CanvasContext)
  const d = data as WebsiteNodeData

  const [urlInput, setUrlInput] = useState(d.url ?? '')
  const iframeLoadedRef = useRef(false)

  const { userRole } = useContext(CanvasContext)

  useEffect(() => {
    if (d.embed_status !== 'pending' || !d.url) return
    iframeLoadedRef.current = false

    const t = setTimeout(async () => {
      if (iframeLoadedRef.current) return
      try {
        const res = await fetch('/api/screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: d.url }),
        })
        const json = await res.json() as { screenshotUrl?: string }
        updateNodeData(id, { embed_status: 'screenshot', screenshot_url: json.screenshotUrl })
      } catch {
        updateNodeData(id, { embed_status: 'screenshot', screenshot_url: undefined })
      }
    }, 3000)

    return () => clearTimeout(t)
  }, [d.embed_status, d.url, id, updateNodeData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userRole === 'viewer') return
    const raw = urlInput.trim()
    if (!raw) return
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    updateNodeData(id, { url, embed_status: 'pending', screenshot_url: undefined })
  }

  const handleIframeLoad = () => {
    if (d.embed_status !== 'pending') return
    iframeLoadedRef.current = true
    updateNodeData(id, { embed_status: 'live' })
  }

  const handleRefresh = () => {
    if (!d.url) return
    updateNodeData(id, { embed_status: 'pending', screenshot_url: undefined })
  }

  const borderColor = selected ? '#6366f1' : '#374151'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minWidth: 320,
        minHeight: 240,
        borderRadius: 12,
        border: `2px solid ${borderColor}`,
        background: '#111827',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: selected ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <NodeResizer
        isVisible={selected && userRole !== 'viewer'}
        minWidth={320}
        minHeight={240}
        handleStyle={{
          width: 14, height: 14,
          backgroundColor: '#10b981',
          border: '2px solid #030712',
          borderRadius: 3,
        }}
        lineStyle={{ borderColor: '#10b981', borderWidth: 1.5 }}
      />

      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-target" />

      {/* Address bar */}
      <div style={{
        height: 40, background: '#0d1117', borderBottom: '1px solid #1f2937',
        display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8, flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="#6b7280" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 1c-1.5 1.5-2.5 4-2.5 7s1 5.5 2.5 7M8 1c1.5 1.5 2.5 4 2.5 7S9.5 13.5 8 15M1 8h14" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>

        {d.url ? (
          <span style={{ flex: 1, fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.url}
          </span>
        ) : (
          <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', gap: 6 }} className="nodrag nopan">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter URL…"
              style={{
                flex: 1, background: '#1f2937', border: '1px solid #374151',
                borderRadius: 6, color: '#f9fafb', fontSize: 11, padding: '3px 8px',
                outline: 'none', fontFamily: 'inherit',
              }}
              autoFocus
            />
            <button type="submit" style={{ background: '#6366f1', border: 'none', borderRadius: 6, color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>
              Go
            </button>
          </form>
        )}

        {d.url && d.embed_status !== 'pending' && (
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
            background: d.embed_status === 'live' ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.15)',
            color: d.embed_status === 'live' ? '#10b981' : '#9ca3af',
            letterSpacing: 0.5, textTransform: 'uppercase', flexShrink: 0,
          }}>
            {d.embed_status === 'live' ? 'Live' : 'Snapshot'}
          </span>
        )}

        {d.embed_status === 'screenshot' && (
          <button className="nodrag nopan" onClick={handleRefresh} title="Re-capture screenshot"
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 8a7 7 0 1 0 1.3-4M1 2v4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, position: 'relative', background: '#0d1117', overflow: 'hidden' }}>
        {!d.url && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
              <path d="M2 12h20" />
            </svg>
            <span style={{ fontSize: 12, color: '#4b5563' }}>Enter a URL above</span>
          </div>
        )}
        {d.url && d.embed_status === 'pending' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}
        {d.url && d.embed_status === 'live' && (
          <iframe src={d.url} onLoad={handleIframeLoad} sandbox="allow-scripts allow-same-origin allow-forms"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} title={d.url} />
        )}
        {d.url && d.embed_status === 'screenshot' && d.screenshot_url && (
          <img src={d.screenshot_url} alt={d.url}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }} draggable={false} />
        )}
        {d.url && d.embed_status === 'screenshot' && !d.screenshot_url && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Screenshot unavailable</span>
            <button className="nodrag nopan" onClick={handleRefresh}
              style={{ fontSize: 11, color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ height: 28, borderTop: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 8px', flexShrink: 0 }}>
        <button
          className="nodrag nopan"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openThread('node', id) }}
          title="Comments"
          style={{
            background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer',
            padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center',
            opacity: selected ? 1 : 0.35, transition: 'opacity 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
        >
          <CommentIcon size={12} />
        </button>
      </div>

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
    </div>
  )
}
