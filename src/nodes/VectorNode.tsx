import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps, type ReactFlowInstance } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { CommentIcon, PencilIcon } from '../components/icons'

// Shared delete button — used by all node types
export function NodeDeleteButton({ id, deleteElements }: {
  id: string
  deleteElements: ReactFlowInstance['deleteElements']
}) {
  return (
    <button
      className="nodrag nopan"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }) }}
      title="Delete"
      style={{
        position: 'absolute', top: 5, left: 5, zIndex: 5,
        width: 18, height: 18, borderRadius: '50%',
        background: 'rgba(31,41,55,0.92)',
        border: '1px solid #374151',
        color: '#6b7280', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, lineHeight: 1, padding: 0,
        transition: 'background 0.12s, color 0.12s',
      }}
      onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#7f1d1d'; b.style.color = '#fca5a5' }}
      onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'rgba(31,41,55,0.92)'; b.style.color = '#6b7280' }}
    >
      ✕
    </button>
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
  const { updateNodeData, deleteElements } = useReactFlow()
  const { openThread, userRole, commentedIds } = useContext(CanvasContext)
  const nodeData = data as VectorNodeData
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nodeData.label ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const colorPreset = VECTOR_COLORS.find((c) => c.name === nodeData.color) ?? VECTOR_COLORS[0]
  const hasComments = commentedIds.has(id)

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
        handleStyle={{
          width: 14, height: 14,
          backgroundColor: colorPreset.accent,
          border: '2px solid #030712',
          borderRadius: 3,
          zIndex: 10,
        }}
        lineStyle={{ borderColor: colorPreset.accent, borderWidth: 1.5 }}
      />

      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-target" />

      {/* Delete button */}
      {selected && userRole !== 'viewer' && (
        <NodeDeleteButton id={id} deleteElements={deleteElements} />
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

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
    </div>
  )
}
