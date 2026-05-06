import { Handle, Position, type NodeProps } from '@xyflow/react'

export function ArrowAnchorNode({ selected }: NodeProps) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: selected ? '#6366f1' : '#475569',
        border: '2.5px solid #e5e7eb',
        cursor: 'grab',
        boxShadow: selected
          ? '0 0 0 3px rgba(99,102,241,0.35)'
          : '0 1px 4px rgba(0,0,0,0.5)',
        transition: 'background 0.12s ease, box-shadow 0.12s ease',
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: 'none', width: 1, height: 1 }}
      />
    </div>
  )
}
