import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { NodeDeleteButton } from './VectorNode'

export type TextNodeData = {
  text?: string
  fontSize?: number
  color?: string
  autoEdit?: boolean
}

const FONT_SIZES = [14, 18, 24, 32, 48]
const TEXT_COLORS = ['#f3f4f6', '#fbbf24', '#60a5fa', '#34d399', '#f87171', '#c084fc']
const SIZE_LABELS: Record<number, string> = { 14: 'S', 18: 'M', 24: 'L', 32: 'XL', 48: '2X' }

export function TextNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const { userRole } = useContext(CanvasContext)
  const d = data as TextNodeData
  const fontSize = d.fontSize ?? 18
  const color = d.color ?? '#f3f4f6'

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(d.text ?? '')
  const [hovered, setHovered] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoEditFired = useRef(false)

  // Auto-enter edit when freshly created
  useEffect(() => {
    if (!autoEditFired.current && d.autoEdit && userRole !== 'viewer') {
      autoEditFired.current = true
      updateNodeData(id, { autoEdit: undefined })
      setEditing(true)
    }
  }, [d.autoEdit, id, updateNodeData, userRole])

  useEffect(() => {
    if (!editing) setDraft(d.text ?? '')
  }, [d.text, editing])

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    setEditing(false)
    updateNodeData(id, { text: draft.trim() || undefined })
  }, [id, draft, updateNodeData])

  const startEditing = useCallback((e: React.MouseEvent) => {
    if (userRole === 'viewer') return
    e.stopPropagation()
    setEditing(true)
  }, [userRole])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') { setDraft(d.text ?? ''); setEditing(false) }
  }

  const showControls = (selected || hovered) && !editing && userRole !== 'viewer'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={startEditing}
      style={{
        width: '100%', height: '100%',
        minWidth: 80, minHeight: 32,
        position: 'relative',
        background: 'transparent',
        border: selected
          ? '1.5px dashed rgba(99,102,241,0.6)'
          : hovered ? '1.5px dashed rgba(255,255,255,0.18)' : '1.5px dashed transparent',
        borderRadius: 6,
        padding: '4px 6px',
        cursor: editing ? 'text' : 'default',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}
    >
      <NodeResizer
        isVisible={selected && !editing && userRole !== 'viewer'}
        minWidth={80}
        minHeight={32}
        handleStyle={{ width: 12, height: 12, backgroundColor: '#6366f1', border: '2px solid #030712', borderRadius: 3 }}
        lineStyle={{ borderColor: '#6366f1', borderWidth: 1 }}
      />

      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />

      {userRole !== 'viewer' && (
        <NodeDeleteButton id={id} deleteElements={deleteElements} visible={hovered} />
      )}

      {editing ? (
        <textarea
          ref={textareaRef}
          className="nodrag nopan"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', height: '100%', minHeight: 32,
            background: 'transparent', border: 'none', outline: 'none',
            color, fontSize, lineHeight: 1.4,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 600, resize: 'none',
          }}
        />
      ) : (
        <div style={{
          color: draft ? color : 'rgba(255,255,255,0.22)',
          fontSize, lineHeight: 1.4,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 600,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          userSelect: 'none',
        }}>
          {draft || (selected ? 'Double-click to edit' : '')}
        </div>
      )}

      {/* Font size + color toolbar */}
      {showControls && (
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute', bottom: -38, left: 0,
            display: 'flex', alignItems: 'center', gap: 3,
            background: 'rgba(3,7,18,0.92)',
            border: '1px solid #374151',
            borderRadius: 8, padding: '4px 7px',
            zIndex: 10,
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {FONT_SIZES.map(s => (
            <button
              key={s}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => updateNodeData(id, { fontSize: s })}
              style={{
                background: s === fontSize ? '#6366f1' : 'none',
                border: 'none', borderRadius: 4,
                color: '#e5e7eb', fontSize: 10, fontWeight: 700,
                padding: '2px 5px', cursor: 'pointer', lineHeight: 1,
              }}
            >
              {SIZE_LABELS[s]}
            </button>
          ))}
          <div style={{ width: 1, height: 12, background: '#374151', margin: '0 2px', flexShrink: 0 }} />
          {TEXT_COLORS.map(c => (
            <button
              key={c}
              onMouseDown={e => e.stopPropagation()}
              onClick={() => updateNodeData(id, { color: c })}
              style={{
                width: 13, height: 13, borderRadius: '50%',
                background: c, padding: 0, cursor: 'pointer', flexShrink: 0,
                border: c === color ? '2px solid white' : '1.5px solid rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
