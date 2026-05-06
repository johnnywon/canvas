import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { CommentIcon, PencilIcon } from '../components/icons'

export type VectorNodeData = {
  label?: string
}

export function VectorNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const { openThread, userRole } = useContext(CanvasContext)
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

  const commit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { label: draft })
  }, [id, draft, updateNodeData])

  const startEditing = useCallback((e: React.MouseEvent) => {
    if (userRole === 'viewer') return
    e.stopPropagation()
    setEditing(true)
  }, [userRole])

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
        boxSizing: 'border-box',
      }}
    >
      <NodeResizer
        isVisible={selected && !editing && userRole !== 'viewer'}
        minWidth={120}
        minHeight={60}
        handleStyle={{
          width: 14, height: 14,
          backgroundColor: '#6366f1',
          border: '2px solid #030712',
          borderRadius: 3,
          zIndex: 10,
        }}
        lineStyle={{ borderColor: '#6366f1', borderWidth: 1.5 }}
      />

      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-target" />

      {/* Edit pencil icon — single click to edit */}
      {!editing && userRole !== 'viewer' && (
        <button
          className="nodrag nopan"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={startEditing}
          title="Edit text"
          style={{
            position: 'absolute', top: 6, right: 6,
            background: 'none', border: 'none',
            color: '#4b5563', cursor: 'pointer',
            padding: '3px', borderRadius: 4,
            display: 'flex', alignItems: 'center',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#818cf8')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
        >
          <PencilIcon size={11} />
        </button>
      )}

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
            color: draft ? '#f3f4f6' : '#4b5563',
            textAlign: 'center', lineHeight: 1.5,
            userSelect: 'none', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
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
          position: 'absolute', bottom: 6, right: 8,
          background: 'none', border: 'none',
          color: '#4b5563', cursor: 'pointer', padding: '2px 3px',
          borderRadius: 4, display: 'flex', alignItems: 'center',
          opacity: selected ? 1 : 0.35,
          transition: 'opacity 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
      >
        <CommentIcon size={12} />
      </button>

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
    </div>
  )
}
