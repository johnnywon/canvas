import { Handle, Position, type NodeProps } from '@xyflow/react'

export function ArrowAnchorNode({ data, selected }: NodeProps) {
  const d = data as { color?: string }
  const color = d.color ?? '#e5e7eb'

  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: selected ? color : '#1f2937',
        border: `2px solid ${color}`,
        cursor: 'grab',
        boxShadow: selected
          ? `0 0 0 3px ${color}33, 0 1px 4px rgba(0,0,0,0.5)`
          : '0 1px 4px rgba(0,0,0,0.5)',
        transition: 'background 0.12s ease, box-shadow 0.12s ease',
      }}
    >
      {/* Centered handles — edge endpoint lands at the dot center */}
      <Handle
        type="target"
        position={Position.Left}
        id="target"
        style={{
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0, width: 1, height: 1,
          minWidth: 0, minHeight: 0,
          pointerEvents: 'none',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source"
        style={{
          left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0, width: 1, height: 1,
          minWidth: 0, minHeight: 0,
        }}
      />
    </div>
  )
}
