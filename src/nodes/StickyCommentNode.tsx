import { useState } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'
import { CommentIcon } from '../components/icons'
import { NodeDeleteButton } from './VectorNode'
import { useContext } from 'react'

export function StickyCommentNode({ id, selected }: NodeProps) {
  const { openThread, userRole } = useContext(CanvasContext)
  const { deleteElements } = useReactFlow()
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        overflow: 'visible',  // lets delete button render outside the 48×48 box
      }}
    >
      {/* The sticky note itself */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); openThread('node', id, 'sticky_comment') }}
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
          color: 'rgba(0,0,0,0.55)',
        }}
        title="Open comments"
      >
        <CommentIcon size={22} />
      </div>

      {/* Delete button — overflows outside the sticky note */}
      {userRole !== 'viewer' && (
        <NodeDeleteButton id={id} deleteElements={deleteElements} visible={hovered} />
      )}

      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}
