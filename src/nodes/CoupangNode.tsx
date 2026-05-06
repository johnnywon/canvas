import { Handle, Position, type NodeProps } from '@xyflow/react'

export type CoupangNodeData = {
  label: string
  itemId?: string
  category?: string
}

export function CoupangNode({ data, selected }: NodeProps) {
  const d = data as CoupangNodeData
  return (
    <div
      style={{
        background: selected ? '#1a1520' : '#120f1a',
        border: `2px solid ${selected ? '#c9a0dc' : '#7c3aed'}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 180,
        boxShadow: selected ? '0 0 0 3px rgba(124,58,237,0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.15s ease',
      }}
    >
      <Handle type="target" position={Position.Left} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <CoupangLogo />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Coupang
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
        {d.label}
      </div>

      {d.itemId && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Item: <span style={{ color: '#a78bfa' }}>{d.itemId}</span>
        </div>
      )}
      {d.category && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Category: {d.category}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function CoupangLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="20" height="12" rx="3" fill="#7c3aed" opacity="0.8" />
      <text
        x="4"
        y="15"
        fontSize="8"
        fontWeight="900"
        fill="white"
        fontFamily="Arial, sans-serif"
        letterSpacing="0.5"
      >
        CPNG
      </text>
    </svg>
  )
}
