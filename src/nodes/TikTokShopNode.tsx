import { Handle, Position, type NodeProps } from '@xyflow/react'

export type TikTokShopNodeData = {
  label: string
  productId?: string
  region?: string
}

export function TikTokShopNode({ data, selected }: NodeProps) {
  const d = data as TikTokShopNodeData
  return (
    <div
      style={{
        background: selected ? '#1a1a2e' : '#12121f',
        border: `2px solid ${selected ? '#69c9d0' : '#fe2c55'}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 180,
        boxShadow: selected ? '0 0 0 3px rgba(254,44,85,0.25)' : '0 2px 8px rgba(0,0,0,0.4)',
        transition: 'all 0.15s ease',
      }}
    >
      <Handle type="target" position={Position.Left} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <TikTokLogo />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#fe2c55', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          TikTok Shop
        </span>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
        {d.label}
      </div>

      {d.productId && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          ID: <span style={{ color: '#69c9d0' }}>{d.productId}</span>
        </div>
      )}
      {d.region && (
        <div style={{ fontSize: 11, color: '#94a3b8' }}>
          Region: {d.region}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  )
}

function TikTokLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.41a8.16 8.16 0 0 0 4.77 1.52V7.48a4.85 4.85 0 0 1-1-.79z"
        fill="#fe2c55"
      />
      <path
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.41a8.16 8.16 0 0 0 4.77 1.52V7.48a4.85 4.85 0 0 1-1-.79z"
        fill="#69c9d0"
        opacity="0.5"
      />
    </svg>
  )
}
