import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { CommentIcon } from '../components/icons'

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  selected,
  markerEnd,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })

  const { setEdges } = useReactFlow()
  const { openThread } = useContext(CanvasContext)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(typeof label === 'string' ? label : '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(typeof label === 'string' ? label : '')
  }, [label, editing])

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus()
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    setEdges((eds) =>
      eds.map((e) => (e.id === id ? { ...e, label: draft || undefined } : e))
    )
  }, [id, draft, setEdges])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') {
      setDraft(typeof label === 'string' ? label : '')
      setEditing(false)
    }
  }

  const hasLabel = typeof label === 'string' && label.length > 0

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: '#374151', strokeWidth: 2, ...style }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          className="nodrag nopan"
        >
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={handleKeyDown}
              placeholder="Edge label…"
              style={{
                background: 'white',
                border: '1px solid #d1d5db',
                borderRadius: 999,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 500,
                color: '#111827',
                outline: 'none',
                width: 130,
                fontFamily: 'system-ui, sans-serif',
              }}
            />
          ) : hasLabel ? (
            <span
              style={{
                background: 'white',
                color: '#111827',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'default',
                boxShadow: '0 1px 3px rgba(0,0,0,0.35)',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
              onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
            >
              {label as string}
            </span>
          ) : selected ? (
            <span
              style={{
                color: '#6b7280',
                fontSize: 10,
                cursor: 'default',
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px dashed #374151',
                userSelect: 'none',
                whiteSpace: 'nowrap',
              }}
              onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
            >
              + label
            </span>
          ) : null}

          {selected && (
            <button
              className="nodrag nopan"
              onClick={() => openThread('edge', id)}
              title="Comments"
              style={{
                background: 'rgba(13,17,23,0.9)',
                border: '1px solid #374151',
                borderRadius: 6,
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '3px 5px',
                display: 'flex',
                alignItems: 'center',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#9ca3af')}
            >
              <CommentIcon size={11} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
