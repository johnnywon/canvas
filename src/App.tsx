import { useCallback, useState } from 'react'
import {
  ReactFlow,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { AmazonNode, TikTokShopNode, CoupangNode } from './nodes'

const nodeTypes = {
  amazon: AmazonNode,
  tiktokShop: TikTokShopNode,
  coupang: CoupangNode,
}

const initialNodes: Node[] = [
  {
    id: 'amazon-1',
    type: 'amazon',
    position: { x: 80, y: 160 },
    data: { label: 'US Storefront', asin: 'B0CX4P7J9H', marketplace: 'amazon.com' },
  },
  {
    id: 'tiktok-1',
    type: 'tiktokShop',
    position: { x: 380, y: 80 },
    data: { label: 'Viral Drop', productId: 'TTS-00421', region: 'US' },
  },
  {
    id: 'coupang-1',
    type: 'coupang',
    position: { x: 380, y: 280 },
    data: { label: 'KR Electronics', itemId: 'CP-88210', category: 'Electronics' },
  },
  {
    id: 'amazon-2',
    type: 'amazon',
    position: { x: 680, y: 180 },
    data: { label: 'JP Storefront', asin: 'B0CX4P7J9H', marketplace: 'amazon.co.jp' },
  },
]

const initialEdges: Edge[] = [
  { id: 'e1', source: 'amazon-1', target: 'tiktok-1', animated: true, style: { stroke: '#fe2c55', strokeWidth: 2 } },
  { id: 'e2', source: 'amazon-1', target: 'coupang-1', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } },
  { id: 'e3', source: 'tiktok-1', target: 'amazon-2', style: { stroke: '#e47911', strokeWidth: 2 } },
  { id: 'e4', source: 'coupang-1', target: 'amazon-2', style: { stroke: '#e47911', strokeWidth: 2 } },
]

const PALETTE_ITEMS = [
  { type: 'amazon', label: 'Amazon' },
  { type: 'tiktokShop', label: 'TikTok Shop' },
  { type: 'coupang', label: 'Coupang' },
]

const PALETTE_COLORS: Record<string, string> = {
  amazon: '#e47911',
  tiktokShop: '#fe2c55',
  coupang: '#7c3aed',
}

let nodeCounter = 10

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [rfInstance, setRfInstance] = useState<Parameters<typeof ReactFlow>[0]['onInit'] extends ((i: infer I) => void) ? I : never>(null as never)

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges],
  )

  const addNode = useCallback(
    (type: string) => {
      const id = `${type}-${++nodeCounter}`
      const defaults: Record<string, Record<string, unknown>> = {
        amazon: { label: 'New Storefront', marketplace: 'amazon.com' },
        tiktokShop: { label: 'New Product', region: 'US' },
        coupang: { label: 'New Listing', category: 'General' },
      }
      const newNode: Node = {
        id,
        type,
        position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 },
        data: defaults[type] ?? { label: 'Node' },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes],
  )

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          height: 52,
          background: '#0d111b',
          borderBottom: '1px solid #1e2a3a',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', letterSpacing: -0.3 }}>
          Pulson Canvas
        </span>
        <span style={{ fontSize: 12, color: '#475569', marginLeft: 4 }}>
          Marketplace Workflow Builder
        </span>

        <div style={{ flex: 1 }} />

        {/* Palette */}
        <div style={{ display: 'flex', gap: 8 }}>
          {PALETTE_ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => addNode(item.type)}
              style={{
                background: 'transparent',
                border: `1.5px solid ${PALETTE_COLORS[item.type]}`,
                borderRadius: 8,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: PALETTE_COLORS[item.type],
                cursor: 'pointer',
                transition: 'background 0.12s ease',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background =
                  PALETTE_COLORS[item.type] + '22'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              + {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setRfInstance}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: false }}
          style={{ background: '#0f1117' }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#1e2a3a"
          />
          <Controls
            style={{ background: '#0d111b', border: '1px solid #1e2a3a', borderRadius: 8 }}
          />
          <MiniMap
            style={{ background: '#0d111b', border: '1px solid #1e2a3a', borderRadius: 8 }}
            nodeColor={(n) => {
              if (n.type === 'amazon') return '#e47911'
              if (n.type === 'tiktokShop') return '#fe2c55'
              if (n.type === 'coupang') return '#7c3aed'
              return '#475569'
            }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
