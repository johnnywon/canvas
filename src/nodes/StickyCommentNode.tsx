import { useContext } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'

export function StickyCommentNode({ id, selected }: NodeProps) {
  const { openThread } = useContext(CanvasContext)

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); openThread('node', id) }}
      style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        background: '#fbbf24',
        border: `2px solid ${selected ? '#f59e0b' : '#d97706'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 0 0 3px rgba(251,191,36,0.3), 2px 3px 8px rgba(0,0,0,0.4)'
          : '2px 3px 8px rgba(0,0,0,0.3)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      title="Open comments"
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          fill="rgba(0,0,0,0.5)"
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}
