import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
// userRole read inside component

export type VectorNodeData = {
  label?: string
}

export function VectorNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const { openThread } = useContext(CanvasContext)
  const nodeData = data as VectorNodeData
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nodeData.label ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) setDraft(nodeData.label ?? '')
  }, [nodeData.label, editing])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  const { userRole } = useContext(CanvasContext)

  const commit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { label: draft })
  }, [id, draft, updateNodeData])

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (userRole === 'viewer') return
    e.stopPropagation()
    setEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setDraft(nodeData.label ?? ''); setEditing(false) }
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        minWidth: 160,
        minHeight: 80,
        borderRadius: 12,
        border: `2px solid ${selected ? '#6366f1' : '#374151'}`,
        background: selected ? '#1e1b4b' : '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 16px 28px',
        cursor: editing ? 'text' : 'default',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        boxShadow: selected ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-target" />

      {editing ? (
        <textarea
          ref={textareaRef}
          className="nodrag nopan"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#f3f4f6',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            resize: 'none',
            textAlign: 'center',
            width: '100%',
            lineHeight: 1.5,
          }}
          rows={3}
        />
      ) : (
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: draft ? '#f3f4f6' : '#4b5563',
            textAlign: 'center',
            lineHeight: 1.5,
            userSelect: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {draft || 'Double-click to edit'}
        </span>
      )}

      {/* Comment button */}
      <button
        className="nodrag nopan"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); openThread('node', id) }}
        title="Comments"
        style={{
          position: 'absolute',
          bottom: 6,
          right: 8,
          background: 'none',
          border: 'none',
          color: '#4b5563',
          cursor: 'pointer',
          padding: '2px 3px',
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          opacity: selected ? 1 : 0.4,
          transition: 'opacity 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h3v3l3-3h6c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z" />
        </svg>
      </button>

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
    </div>
  )
}
