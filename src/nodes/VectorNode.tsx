import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'

export type VectorNodeData = {
  label?: string
}

export function VectorNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const nodeData = data as VectorNodeData
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(nodeData.label ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Sync draft when data changes externally (e.g. on initial load)
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commit()
    }
    if (e.key === 'Escape') {
      setDraft(nodeData.label ?? '')
      setEditing(false)
    }
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
        padding: '12px 16px',
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

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
    </div>
  )
}
