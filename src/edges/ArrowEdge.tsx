import { useCallback, useEffect, useRef, useState } from 'react'
import { EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react'

export type ArrowEdgeData = {
  color?: string
  label?: string
  anchorId?: string
}

const COLORS = ['#e5e7eb', '#60a5fa', '#f87171', '#34d399', '#fbbf24', '#c084fc']

export function ArrowEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data, selected,
}: EdgeProps) {
  const { setEdges, deleteElements } = useReactFlow()
  const d = (data ?? {}) as ArrowEdgeData
  const color = d.color ?? '#e5e7eb'

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const onEnter = () => { clearTimeout(leaveTimer.current); setHovered(true) }
  const onLeave = () => { leaveTimer.current = setTimeout(() => setHovered(false), 120) }

  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState(d.label ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editingLabel) setLabelDraft(d.label ?? '')
  }, [d.label, editingLabel])

  useEffect(() => {
    if (editingLabel) inputRef.current?.focus()
  }, [editingLabel])

  const commitLabel = useCallback(() => {
    setEditingLabel(false)
    const trimmed = labelDraft.trim()
    setEdges(eds => eds.map(e =>
      e.id === id ? { ...e, data: { ...e.data, label: trimmed || undefined } } : e
    ))
  }, [id, labelDraft, setEdges])

  const markerId = `arrowhead-${id.replace(/[^a-z0-9]/gi, '')}`
  const showControls = hovered || !!selected

  return (
    <>
      <defs>
        <marker id={markerId} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill={color} />
        </marker>
      </defs>

      {/* Wide transparent hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      />

      {/* Visible arrow line */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={showControls ? 2.5 : 2}
        markerEnd={`url(#${markerId})`}
        style={{ pointerEvents: 'none', transition: 'stroke-width 0.12s, stroke 0.12s' }}
      />

      <EdgeLabelRenderer>
        {/* Floating toolbar: color swatches + delete */}
        {showControls && (
          <div
            className="nodrag nopan"
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 14}px)`,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(3,7,18,0.92)',
              border: '1px solid #374151',
              borderRadius: 10,
              padding: '4px 7px',
              pointerEvents: 'all',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              zIndex: 10,
            }}
          >
            {COLORS.map(c => (
              <button
                key={c}
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setEdges(eds => eds.map(e =>
                  e.id === id ? { ...e, data: { ...e.data, color: c } } : e
                ))}
                style={{
                  width: 13, height: 13, borderRadius: '50%',
                  background: c, padding: 0, cursor: 'pointer', flexShrink: 0,
                  border: c === color ? '2px solid white' : '1.5px solid rgba(255,255,255,0.2)',
                }}
              />
            ))}
            <div style={{ width: 1, height: 12, background: '#374151', margin: '0 2px', flexShrink: 0 }} />
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => deleteElements({ edges: [{ id }] })}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'none', border: 'none',
                color: '#6b7280', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, padding: 0,
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#fca5a5')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
            >
              ✕
            </button>
          </div>
        )}

        {/* Label — always visible when text exists, editable on double-click */}
        <div
          className="nodrag nopan"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          onDoubleClick={e => {
            e.stopPropagation()
            setLabelDraft(d.label ?? '')
            setEditingLabel(true)
          }}
        >
          {editingLabel ? (
            <input
              ref={inputRef}
              value={labelDraft}
              onChange={e => setLabelDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={e => {
                if (e.key === 'Enter') commitLabel()
                if (e.key === 'Escape') { setLabelDraft(d.label ?? ''); setEditingLabel(false) }
              }}
              style={{
                background: 'rgba(3,7,18,0.9)',
                border: `1px solid ${color}88`,
                borderRadius: 6,
                color: '#f3f4f6',
                fontSize: 12,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                padding: '2px 8px',
                outline: 'none',
                minWidth: 60,
                textAlign: 'center',
              }}
            />
          ) : d.label ? (
            <div style={{
              background: 'rgba(3,7,18,0.85)',
              border: `1px solid ${color}44`,
              borderRadius: 6,
              color: '#e5e7eb',
              fontSize: 12,
              padding: '2px 8px',
              cursor: 'text',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}>
              {d.label}
            </div>
          ) : showControls ? (
            <div style={{
              color: `${color}55`,
              fontSize: 11,
              padding: '2px 6px',
              cursor: 'text',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}>
              Add label
            </div>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
