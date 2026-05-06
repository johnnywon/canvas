import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { VectorNode } from '../nodes/VectorNode'
import { ImageNode } from '../nodes/ImageNode'

const nodeTypes = {
  vector: VectorNode,
  image: ImageNode,
}

type CanvasData = {
  id: string
  name: string
  owner_email: string
  created_at: string
  updated_at: string
}

type DBNode = {
  id: string
  type: string
  x: number
  y: number
  width: number | null
  height: number | null
  data: string
}

type DBEdge = {
  id: string
  source: string
  target: string
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

function toFlowNode(n: DBNode): Node {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.x, y: n.y },
    data: (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) as Record<string, unknown>,
    ...(n.width != null ? { width: n.width } : {}),
    ...(n.height != null ? { height: n.height } : {}),
  }
}

function toFlowEdge(e: DBEdge): Edge {
  return { id: e.id, source: e.source, target: e.target }
}

export function CanvasEditor() {
  const { id: canvasId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [canvas, setCanvas] = useState<CanvasData | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const isLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Load canvas
  useEffect(() => {
    if (!canvasId) return
    isLoadedRef.current = false
    fetch(`/api/canvases/${canvasId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json() as Promise<{ canvas: CanvasData; nodes: DBNode[]; edges: DBEdge[] }>
      })
      .then(({ canvas: c, nodes: dbNodes, edges: dbEdges }) => {
        setCanvas(c)
        setNodes(dbNodes.map(toFlowNode))
        setEdges(dbEdges.map(toFlowEdge))
        requestAnimationFrame(() => {
          isLoadedRef.current = true
        })
      })
      .catch(() => navigate('/canvases'))
  }, [canvasId, navigate, setNodes, setEdges])

  // Auto-save on changes
  useEffect(() => {
    if (!isLoadedRef.current || !canvasId) return
    setSaveStatus('pending')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        await fetch(`/api/canvases/${canvasId}/state`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type ?? 'vector',
              x: n.position.x,
              y: n.position.y,
              width: n.measured?.width ?? null,
              height: n.measured?.height ?? null,
              data: n.data,
            })),
            edges: edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
            })),
          }),
        })
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 1000)
  }, [nodes, edges, canvasId])

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  )

  const addNode = useCallback(
    (type: 'vector' | 'image') => {
      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position: { x: 120 + Math.random() * 300, y: 100 + Math.random() * 200 },
        data: type === 'vector' ? { label: '' } : { imageUrl: undefined },
      }
      setNodes((nds) => [...nds, newNode])
    },
    [setNodes],
  )

  const statusLabel: Record<SaveStatus, string> = {
    idle: '',
    pending: 'Unsaved changes',
    saving: 'Saving…',
    saved: 'Saved',
    error: 'Save failed',
  }

  const statusColor: Record<SaveStatus, string> = {
    idle: '#6b7280',
    pending: '#f59e0b',
    saving: '#6b7280',
    saved: '#10b981',
    error: '#ef4444',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#030712' }}>
      {/* Header */}
      <div
        style={{
          height: 48,
          background: '#030712',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '0 16px',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate('/canvases')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: 13,
            padding: '4px 8px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
        >
          ← Canvases
        </button>

        <div style={{ width: 1, height: 20, background: '#1f2937' }} />

        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#f9fafb', fontFamily: 'system-ui, sans-serif' }}>
          {canvas?.name ?? '…'}
        </span>

        {saveStatus !== 'idle' && (
          <span style={{ fontSize: 11, color: statusColor[saveStatus], fontFamily: 'system-ui, sans-serif' }}>
            {statusLabel[saveStatus]}
          </span>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <ToolbarButton onClick={() => addNode('vector')} label="+ Vector" color="#6366f1" />
          <ToolbarButton onClick={() => addNode('image')} label="+ Image" color="#0ea5e9" />
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
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, minZoom: 0.3 }}
          style={{ background: '#030712' }}
          deleteKeyCode="Backspace"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1f2937" />
          <Controls
            style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: 10,
            }}
          />
          <MiniMap
            style={{
              background: '#111827',
              border: '1px solid #1f2937',
              borderRadius: 10,
            }}
            nodeColor={(n) => (n.type === 'image' ? '#0ea5e9' : '#6366f1')}
          />
        </ReactFlow>
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  label,
  color,
}: {
  onClick: () => void
  label: string
  color: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: `1.5px solid ${color}`,
        borderRadius: 8,
        color,
        fontSize: 12,
        fontWeight: 600,
        padding: '4px 12px',
        cursor: 'pointer',
        fontFamily: 'system-ui, sans-serif',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${color}22`)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
    >
      {label}
    </button>
  )
}
