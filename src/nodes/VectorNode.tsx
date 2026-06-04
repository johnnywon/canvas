import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps, type ReactFlowInstance } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { CommentIcon, PencilIcon } from '../components/icons'

// Shared delete button — hover to reveal, click for inline confirmation
export function NodeDeleteButton({ id, deleteElements, visible, top = 5, left = 5 }: {
  id: string
  deleteElements: ReactFlowInstance['deleteElements']
  visible: boolean
  top?: number
  left?: number
}) {
  const [confirming, setConfirming] = useState(false)
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Auto-cancel confirmation after 4s of inactivity
  const startConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(true)
    clearTimeout(cancelTimerRef.current)
    cancelTimerRef.current = window.setTimeout(() => setConfirming(false), 4000)
  }

  const cancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearTimeout(cancelTimerRef.current)
    setConfirming(false)
  }

  const confirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteElements({ nodes: [{ id }] })
  }

  const shown = visible || confirming

  return (
    <div
      style={{
        position: 'absolute', top, left, zIndex: 10,
        opacity: shown ? 1 : 0,
        pointerEvents: shown ? 'all' : 'none',
        transition: 'opacity 0.15s ease',
      }}
      className="nodrag nopan"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {confirming ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'rgba(69,10,10,0.97)',
          border: '1px solid #b91c1c',
          borderRadius: 12,
          padding: '3px 5px 3px 8px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.1s ease',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 500 }}>Delete?</span>
          <button
            onClick={confirm}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: '#dc2626', border: 'none',
              color: 'white', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✓</button>
          <button
            onClick={cancel}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fca5a5', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>
      ) : (
        <button
          onClick={startConfirm}
          title="Delete"
          style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'rgba(31,41,55,0.92)',
            border: '1px solid #374151',
            color: '#6b7280', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, lineHeight: 1, padding: 0,
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
          }}
          onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(127,29,29,0.9)'; b.style.color = '#fca5a5'; b.style.borderColor = '#7f1d1d' }}
          onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(31,41,55,0.92)'; b.style.color = '#6b7280'; b.style.borderColor = '#374151' }}
        >
          ✕
        </button>
      )}
    </div>
  )
}

export type VectorNodeData = {
  label?: string
  color?: string
}

const VECTOR_COLORS = [
  { name: 'default', border: '#374151', bg: '#111827', accent: '#6b7280' },
  { name: 'indigo',  border: '#6366f1', bg: '#1e1b4b', accent: '#818cf8' },
  { name: 'sky',     border: '#0ea5e9', bg: '#0c2340', accent: '#38bdf8' },
  { name: 'emerald', border: '#10b981', bg: '#064e3b', accent: '#34d399' },
  { name: 'rose',    border: '#f43f5e', bg: '#4c0519', accent: '#fb7185' },
]

export function VectorNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements, setNodes, getNodes } = useReactFlow()

  // When this node is resized, apply the same dimensions to all other selected vectors
  const syncResize = useCallback(
    (_e: unknown, params: { width: number; height: number }) => {
      const peers = getNodes().filter(n => n.selected && n.type === 'vector' && n.id !== id)
      if (!peers.length) return
      const ids = new Set(peers.map(n => n.id))
      setNodes(nds => nds.map(n =>
        ids.has(n.id) ? { ...n, width: params.width, height: params.height } : n
      ))
    },
    [id, getNodes, setNodes],
  )
  const { openThread, userRole, commentedIds } = useContext(CanvasContext)
  const nodeData = data as VectorNodeData
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nodeData.label ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const colorPreset = VECTOR_COLORS.find((c) => c.name === nodeData.color) ?? VECTOR_COLORS[0]
  const hasComments = commentedIds.has(id)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(nodeData.label ?? '')
  }, [nodeData.label, editing])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { label: draft })
  }, [id, draft, updateNodeData])

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      if (userRole === 'viewer') return
      e.stopPropagation()
      setEditing(true)
    },
    [userRole],
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(nodeData.label ?? ''); setEditing(false) }
  }

  return (
    <div
      onDoubleClick={startEditing}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 120,
        minHeight: 60,
        borderRadius: 12,
        border: `2px solid ${selected ? colorPreset.accent : colorPreset.border}`,
        background: colorPreset.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px 28px',
        cursor: editing ? 'text' : 'default',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxShadow: selected ? `0 0 0 3px ${colorPreset.accent}33` : 'none',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <NodeResizer
        isVisible={selected && !editing && userRole !== 'viewer'}
        minWidth={120}
        minHeight={60}
        onResize={syncResize}
        handleStyle={{
          width: 14, height: 14,
          backgroundColor: colorPreset.accent,
          border: '2px solid #030712',
          borderRadius: 3,
        }}
        lineStyle={{ borderColor: colorPreset.accent, borderWidth: 1.5 }}
      />

      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Top} id="top" />

      {userRole !== 'viewer' && (
        <NodeDeleteButton id={id} deleteElements={deleteElements} visible={hovered} />
      )}

      {/* Edit button */}
      {!editing && userRole !== 'viewer' && (
        <button
          className="nodrag nopan"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={startEditing}
          title="Edit text"
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'none', border: 'none',
            color: '#4b5563', cursor: 'pointer', padding: '3px',
            borderRadius: 4, display: 'flex', alignItems: 'center',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = colorPreset.accent)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
        >
          <PencilIcon size={11} />
        </button>
      )}

      {/* Text content */}
      {editing ? (
        <textarea
          ref={textareaRef}
          className="nodrag nopan"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#f3f4f6', fontSize: 13, fontWeight: 500,
            fontFamily: 'inherit', resize: 'none', textAlign: 'center',
            width: '100%', lineHeight: 1.5,
          }}
          rows={3}
        />
      ) : (
        <span
          style={{
            fontSize: 13, fontWeight: 500,
            color: draft ? '#f3f4f6' : `${colorPreset.accent}88`,
            textAlign: 'center', lineHeight: 1.5,
            userSelect: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        >
          {draft || 'Double-click to edit'}
        </span>
      )}

      {/* Color swatches */}
      {selected && !editing && userRole !== 'viewer' && (
        <div
          style={{ position: 'absolute', bottom: 6, left: 8, display: 'flex', gap: 4 }}
          className="nodrag nopan"
        >
          {VECTOR_COLORS.map((c) => {
            const active = (nodeData.color ?? 'default') === c.name
            return (
              <button
                key={c.name}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); updateNodeData(id, { color: c.name }) }}
                style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: c.accent, padding: 0,
                  border: active ? '2px solid white' : '1.5px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                }}
              />
            )
          })}
        </div>
      )}

      {/* Comment button */}
      <button
        className="nodrag nopan"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); openThread('node', id) }}
        title="Comments"
        style={{
          position: 'absolute', bottom: 6, right: 8,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 3px', borderRadius: 4,
          display: 'flex', alignItems: 'center',
          color: hasComments ? '#fbbf24' : '#4b5563',
          opacity: selected || hasComments ? 1 : 0.35,
          transition: 'opacity 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = hasComments ? '#fbbf24' : colorPreset.accent)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = hasComments ? '#fbbf24' : '#4b5563')}
      >
        <CommentIcon size={12} />
      </button>

      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  )
}
