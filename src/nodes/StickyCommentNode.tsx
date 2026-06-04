import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Handle, NodeResizer, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { CommentIcon } from '../components/icons'
import { NodeDeleteButton } from './VectorNode'

export type StickyNodeData = {
  text?: string
  color?: string
  autoEdit?: boolean
}

const STICKY_COLORS = [
  { name: 'yellow', bg: '#fef08a', text: '#1c1917' },
  { name: 'pink',   bg: '#fda4af', text: '#1c1917' },
  { name: 'sky',    bg: '#7dd3fc', text: '#1c1917' },
  { name: 'green',  bg: '#86efac', text: '#1c1917' },
  { name: 'purple', bg: '#d8b4fe', text: '#1c1917' },
]

export function StickyCommentNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow()
  const { openThread, userRole, commentedIds } = useContext(CanvasContext)
  const d = data as StickyNodeData
  const hasComments = commentedIds.has(id)
  const colorPreset = STICKY_COLORS.find(c => c.name === d.color) ?? STICKY_COLORS[0]

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

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={startEditing}
      style={{
        width: '100%', height: '100%',
        minWidth: 160, minHeight: 120,
        background: colorPreset.bg,
        borderRadius: 4,
        padding: '28px 12px 36px',
        boxSizing: 'border-box',
        boxShadow: selected
          ? '0 0 0 2px #6366f1, 3px 5px 12px rgba(0,0,0,0.35)'
          : '2px 4px 10px rgba(0,0,0,0.28)',
        cursor: editing ? 'text' : 'default',
        position: 'relative',
        transition: 'box-shadow 0.15s ease',
      }}
    >
      <NodeResizer
        isVisible={selected && !editing && userRole !== 'viewer'}
        minWidth={160}
        minHeight={120}
        handleStyle={{ width: 12, height: 12, backgroundColor: 'rgba(0,0,0,0.35)', border: '2px solid rgba(255,255,255,0.6)', borderRadius: 3 }}
        lineStyle={{ borderColor: 'rgba(0,0,0,0.25)', borderWidth: 1 }}
      />

      <Handle type="source" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />

      {userRole !== 'viewer' && (
        <NodeDeleteButton id={id} deleteElements={deleteElements} visible={hovered} top={-10} left={-10} />
      )}

      {/* Comment thread button */}
      <button
        className="nodrag nopan"
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); openThread('node', id, 'sticky_comment') }}
        title="Comments"
        style={{
          position: 'absolute', top: 6, right: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px', borderRadius: 4,
          color: hasComments ? '#6366f1' : 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center',
          opacity: selected || hasComments ? 1 : 0.6,
          transition: 'opacity 0.15s, color 0.15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = hasComments ? '#6366f1' : 'rgba(0,0,0,0.35)')}
      >
        <CommentIcon size={13} />
      </button>

      {/* Text content */}
      {editing ? (
        <textarea
          ref={textareaRef}
          className="nodrag nopan"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', height: '100%',
            background: 'transparent', border: 'none', outline: 'none',
            color: colorPreset.text, fontSize: 14, lineHeight: 1.55,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 500, resize: 'none',
          }}
        />
      ) : (
        <div style={{
          color: draft ? colorPreset.text : 'rgba(0,0,0,0.3)',
          fontSize: 14, lineHeight: 1.55,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 500,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          userSelect: 'none',
          overflow: 'hidden', height: '100%',
        }}>
          {draft || (selected || hovered ? 'Double-click to write…' : '')}
        </div>
      )}

      {/* Color swatches */}
      {selected && !editing && userRole !== 'viewer' && (
        <div
          className="nodrag nopan"
          style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', gap: 5 }}
        >
          {STICKY_COLORS.map(c => (
            <button
              key={c.name}
              onMouseDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); updateNodeData(id, { color: c.name }) }}
              style={{
                width: 14, height: 14, borderRadius: '50%',
                background: c.bg, padding: 0, cursor: 'pointer',
                border: (d.color ?? 'yellow') === c.name
                  ? '2.5px solid #6366f1'
                  : '1.5px solid rgba(0,0,0,0.2)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
