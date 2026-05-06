import { Handle, Position, type NodeProps } from '@xyflow/react'

export type AmazonNodeData = {
  label: string
  asin?: string
  marketplace?: string
}

export function AmazonNode({ data, selected }: NodeProps) {
  const d = data as AmazonNodeData
  return (
    <div
      style={{
        background: selected ? '#1a2535' : '#131a27',
        border: `2px solid ${selected ? '#f90' : '#e47911'}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 180,
        boxShadow: selected ? '0 0 0 3px rgba(255,153,0,0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.15s ease',
      }}
    >
      <Handle type="target" position={Position.Left} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <AmazonLogo />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#f90', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Amazon
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
        {d.label}
      </div>

      {d.asin && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          ASIN: <span style={{ color: '#f90' }}>{d.asin}</span>
        </div>
      )}
      {d.marketplace && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Market: {d.marketplace}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function AmazonLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.7 14.4c-2.4 1.7-5.9 2.6-8.9 1.4-.2-.1-.1-.2.1-.2 3 .4 5.9-.2 8.2-1.5.3-.2.5.1.6.3z"
        fill="#f90"
      />
      <path
        d="M14.5 13.5c-.3-.4-2.2-.2-3-.1-.3 0-.3-.2 0-.3 1.5-.5 3.9-.4 4.2.1.3.5-.1 3.4-1.5 4.8-.2.2-.4.1-.3-.1.3-.9 1-2.9.6-4.4z"
        fill="#f90"
      />
      <text
        x="3"
        y="11"
        fontSize="9"
        fontWeight="bold"
        fill="#e2e8f0"
        fontFamily="Arial, sans-serif"
      >
        amzn
      </text>
    </svg>
  )
}
