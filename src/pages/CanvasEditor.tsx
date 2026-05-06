import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  type OnConnect,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { CanvasContext, type ActiveThread, type UserRole } from '../contexts/CanvasContext'
import { VectorNode } from '../nodes/VectorNode'
import { ImageNode } from '../nodes/ImageNode'
import { WebsiteNode } from '../nodes/WebsiteNode'
import { StickyCommentNode } from '../nodes/StickyCommentNode'
import { ArrowAnchorNode } from '../nodes/ArrowAnchorNode'
import { LabeledEdge } from '../edges/LabeledEdge'
import { ArrowEdge } from '../edges/ArrowEdge'
import { CommentPanel } from '../components/CommentPanel'
import { ShareModal } from '../components/ShareModal'
import { SortGridIcon, LockIcon, UnlockIcon } from '../components/icons'

const nodeTypes = {
  vector: VectorNode,
  image: ImageNode,
  website: WebsiteNode,
  sticky_comment: StickyCommentNode,
  arrow_anchor: ArrowAnchorNode,
}

const edgeTypes = {
  labeled: LabeledEdge,
  arrow: ArrowEdge,
}

const defaultEdgeOptions = {
  type: 'labeled',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
}

type CanvasData = {
  id: string
  name: string
  owner_email: string
  created_at: string
  updated_at: string
  userRole: UserRole
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
  label: string | null
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'readonly'

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

function toFlowEdge(e: DBEdge, nodeTypeMap: Map<string, string>): Edge {
  const isArrow =
    nodeTypeMap.get(e.source) === 'arrow_anchor' ||
    nodeTypeMap.get(e.target) === 'arrow_anchor'
  if (isArrow) {
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'arrow',
      markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: '#e5e7eb' },
      style: { stroke: '#e5e7eb', strokeWidth: 3 },
    }
  }
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'labeled',
    label: e.label ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
  }
}

// ── Outer shell: provides ReactFlowProvider ───────────────────────────────────
export function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  )
}

// ── Inner: all logic lives here, can use useReactFlow() ──────────────────────
function CanvasEditorInner() {
  const { id: canvasId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { screenToFlowPosition } = useReactFlow()

  const [canvas, setCanvas] = useState<CanvasData | null>(null)
  const [userRole, setUserRole] = useState<UserRole>('owner')
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [activeThread, setActiveThread] = useState<ActiveThread>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [isInteractive, setIsInteractive] = useState(true)
  const [preferredLang, setPreferredLangState] = useState<'en' | 'ko'>(
    () => (localStorage.getItem('preferredLang') as 'en' | 'ko') ?? 'en'
  )

  const isLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const isViewer = userRole === 'viewer'

  // ── Context ────────────────────────────────────────────────────────────────
  const openThread = useCallback((parentType: 'node' | 'edge', parentId: string) => {
    setActiveThread({ parentType, parentId })
  }, [])

  const closeThread = useCallback(() => setActiveThread(null), [])

  const setPreferredLang = useCallback((lang: 'en' | 'ko') => {
    setPreferredLangState(lang)
    localStorage.setItem('preferredLang', lang)
  }, [])

  const ctxValue = useMemo(() => ({
    canvasId: canvasId ?? '',
    userRole,
    currentUserEmail,
    preferredLang,
    setPreferredLang,
    openThread,
    closeThread,
    activeThread,
  }), [canvasId, userRole, currentUserEmail, preferredLang, setPreferredLang, openThread, closeThread, activeThread])

  // ── Load canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasId) return
    isLoadedRef.current = false
    Promise.all([
      fetch('/api/me').then((r) => r.json() as Promise<{ email: string }>),
      fetch(`/api/canvases/${canvasId}`).then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json() as Promise<{ canvas: CanvasData; nodes: DBNode[]; edges: DBEdge[] }>
      }),
    ])
      .then(([me, data]) => {
        setCurrentUserEmail(me.email)
        setCanvas(data.canvas)
        setUserRole((data.canvas.userRole as UserRole) ?? 'viewer')
        const nodeTypeMap = new Map<string, string>(
          data.nodes.map((n: DBNode) => [n.id, n.type])
        )
        setNodes(data.nodes.map(toFlowNode))
        setEdges(data.edges.map((e: DBEdge) => toFlowEdge(e, nodeTypeMap)))
        requestAnimationFrame(() => { isLoadedRef.current = true })
      })
      .catch(() => navigate('/canvases'))
  }, [canvasId, navigate, setNodes, setEdges])

  // ── Auto-save (skipped for viewers) ───────────────────────────────────────
  useEffect(() => {
    if (!isLoadedRef.current || !canvasId || isViewer) return
    setSaveStatus('pending')
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving')
      try {
        const res = await fetch(`/api/canvases/${canvasId}/state`, {
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
              label: typeof e.label === 'string' ? e.label : null,
            })),
          }),
        })
        if (res.status === 403) { setSaveStatus('readonly'); return }
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 1000)
  }, [nodes, edges, canvasId, isViewer])

  // ── Edge connect ───────────────────────────────────────────────────────────
  const onConnect: OnConnect = useCallback(
    (connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, type: 'labeled', markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' } }, eds)
      ),
    [setEdges],
  )

  // ── Add node ───────────────────────────────────────────────────────────────
  const addNode = useCallback(
    (type: 'vector' | 'image' | 'website') => {
      const defaults: Record<string, Record<string, unknown>> = {
        vector: { label: '' },
        image: { imageUrl: undefined },
        website: { url: undefined, embed_status: undefined },
      }
      setNodes((nds) => [
        ...nds,
        { id: crypto.randomUUID(), type, position: { x: 120 + Math.random() * 300, y: 100 + Math.random() * 200 }, data: defaults[type] },
      ])
    },
    [setNodes],
  )

  // ── Double-click canvas → drop sticky comment ──────────────────────────────
  const onPaneDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isViewer) return
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const nodeId = crypto.randomUUID()
      setNodes((nds) => [...nds, { id: nodeId, type: 'sticky_comment', position: pos, data: {} }])
      openThread('node', nodeId)
    },
    [screenToFlowPosition, setNodes, openThread, isViewer],
  )

  const commitRename = useCallback(async () => {
    if (!nameDraft.trim() || !canvasId) { setEditingName(false); return }
    const newName = nameDraft.trim()
    setEditingName(false)
    setCanvas((c) => (c ? { ...c, name: newName } : c))
    await fetch(`/api/canvases/${canvasId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    })
  }, [nameDraft, canvasId])

  const sortNodes = useCallback(() => {
    setNodes((nds) => {
      if (!nds.length) return nds
      const GAP = 48, PAD = 60
      const cols = Math.max(1, Math.round(Math.sqrt(nds.length * 1.2)))
      // Sort by current canvas position so the visual order is preserved
      const sorted = [...nds].sort((a, b) =>
        a.position.y !== b.position.y
          ? a.position.y - b.position.y
          : a.position.x - b.position.x
      )
      let curX = PAD, curY = PAD, rowMaxH = 0, col = 0
      return sorted.map((node) => {
        const w = node.measured?.width ?? 220
        const h = node.measured?.height ?? 160
        if (col > 0 && col >= cols) {
          curX = PAD; curY += rowMaxH + GAP; rowMaxH = 0; col = 0
        }
        const pos = { x: curX, y: curY }
        curX += w + GAP
        rowMaxH = Math.max(rowMaxH, h)
        col++
        return { ...node, position: pos }
      })
    })
  }, [setNodes])

  const addArrow = useCallback(() => {
    const tailId = crypto.randomUUID()
    const headId = crypto.randomUUID()
    const edgeId = crypto.randomUUID()
    const x = 150 + Math.random() * 280
    const y = 150 + Math.random() * 180
    setNodes((nds) => [
      ...nds,
      { id: tailId, type: 'arrow_anchor', position: { x, y }, data: {} },
      { id: headId, type: 'arrow_anchor', position: { x: x + 160, y }, data: {} },
    ])
    setEdges((eds) => [
      ...eds,
      {
        id: edgeId,
        source: tailId,
        target: headId,
        type: 'arrow',
        markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: '#e5e7eb' },
        style: { stroke: '#e5e7eb', strokeWidth: 3 },
      },
    ])
  }, [setNodes, setEdges])

  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      const anchorIds = new Set(
        deletedEdges
          .filter((e) => e.type === 'arrow')
          .flatMap((e) => [e.source, e.target])
      )
      if (anchorIds.size) setNodes((nds) => nds.filter((n) => !anchorIds.has(n.id)))
    },
    [setNodes],
  )

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.type === 'sticky_comment') openThread('node', node.id)
    },
    [openThread],
  )

  // ── Status display ─────────────────────────────────────────────────────────
  const statusLabel: Record<SaveStatus, string> = {
    idle: '', pending: 'Unsaved changes', saving: 'Saving…',
    saved: 'Saved', error: 'Save failed', readonly: 'View only',
  }
  const statusColor: Record<SaveStatus, string> = {
    idle: '#6b7280', pending: '#f59e0b', saving: '#6b7280',
    saved: '#10b981', error: '#ef4444', readonly: '#f59e0b',
  }

  return (
    <CanvasContext.Provider value={ctxValue}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#030712' }}>

        {/* Header */}
        <div style={{ height: 48, background: '#030712', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0, zIndex: 10 }}>
          <button
            onClick={() => navigate('/canvases')}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
          >
            ← Canvases
          </button>

          <div style={{ width: 1, height: 20, background: '#1f2937' }} />

          {editingName ? (
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false) }}
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none',
                borderBottom: '1px solid #6366f1', outline: 'none',
                color: '#f9fafb', fontSize: 14, fontWeight: 600,
                fontFamily: 'system-ui, sans-serif', padding: '0 2px',
              }}
            />
          ) : (
            <span
              onClick={() => { if (!isViewer) { setNameDraft(canvas?.name ?? ''); setEditingName(true) } }}
              title={isViewer ? canvas?.name : 'Click to rename'}
              style={{
                flex: 1, fontSize: 14, fontWeight: 600, color: '#f9fafb',
                fontFamily: 'system-ui, sans-serif',
                cursor: isViewer ? 'default' : 'text',
              }}
            >
              {canvas?.name ?? '…'}
            </span>
          )}

          {/* Viewer badge */}
          {isViewer && (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '3px 10px', borderRadius: 6, letterSpacing: 0.3 }}>
              Viewer
            </span>
          )}

          {/* Save status */}
          {!isViewer && saveStatus !== 'idle' && (
            <span style={{ fontSize: 11, color: statusColor[saveStatus], fontFamily: 'system-ui, sans-serif' }}>
              {statusLabel[saveStatus]}
            </span>
          )}

          {/* EN / KO language toggle */}
          <div style={{ display: 'flex', background: '#111827', border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden' }}>
            {(['en', 'ko'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setPreferredLang(lang)}
                style={{
                  background: preferredLang === lang ? '#6366f1' : 'transparent',
                  border: 'none', color: preferredLang === lang ? 'white' : '#6b7280',
                  fontSize: 11, fontWeight: 700, padding: '4px 10px', cursor: 'pointer',
                  letterSpacing: 0.5, transition: 'background 0.15s, color 0.15s',
                }}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Share button — owner only */}
          {userRole === 'owner' && (
            <button
              onClick={() => setShareOpen(true)}
              style={{
                background: '#111827', border: '1.5px solid #374151', borderRadius: 8,
                color: '#e5e7eb', fontSize: 12, fontWeight: 600, padding: '4px 14px',
                cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1'; (e.currentTarget as HTMLButtonElement).style.color = '#a5b4fc' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#374151'; (e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb' }}
            >
              Share
            </button>
          )}

          {/* Add node toolbar — hidden for viewers */}
          {!isViewer && (
            <div style={{ display: 'flex', gap: 6 }}>
              <ToolbarButton onClick={() => addNode('vector')} label="+ Vector" color="#6366f1" />
              <ToolbarButton onClick={() => addNode('image')} label="+ Image" color="#0ea5e9" />
              <ToolbarButton onClick={() => addNode('website')} label="+ Website" color="#10b981" />
              <ToolbarButton onClick={addArrow} label="↗ Arrow" color="#94a3b8" />
              <ToolbarButton
                onClick={() => {
                  const nodeId = crypto.randomUUID()
                  setNodes((nds) => [...nds, { id: nodeId, type: 'sticky_comment', position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 }, data: {} }])
                  openThread('node', nodeId)
                }}
                label="+ Sticky"
                color="#fbbf24"
              />
            </div>
          )}
        </div>

        {/* Canvas + panel */}
        <div
          style={{ flex: 1, position: 'relative' }}
          onDoubleClick={(e) => {
            const t = e.target as HTMLElement
            if (t.closest('.react-flow__node') || t.closest('.react-flow__edge')) return
            onPaneDoubleClick(e)
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={isViewer ? undefined : onConnect}
            onEdgesDelete={onEdgesDelete}
            onPaneClick={() => setActiveThread(null)}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            nodesDraggable={!isViewer && isInteractive}
            nodesConnectable={!isViewer && isInteractive}
            deleteKeyCode={isViewer || !isInteractive ? null : 'Backspace'}
            elementsSelectable={true}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.3 }}
            style={{ background: '#030712' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1f2937" />
            <Controls
              showInteractive={false}
              style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10 }}
            >
              {!isViewer && (
                <ControlButton onClick={sortNodes} title="Sort nodes into a grid">
                  <SortGridIcon size={12} />
                </ControlButton>
              )}
              <ControlButton
                onClick={() => setIsInteractive((v) => !v)}
                title={isInteractive ? 'Lock canvas' : 'Unlock canvas'}
              >
                {isInteractive ? <UnlockIcon size={11} /> : <LockIcon size={11} />}
              </ControlButton>
            </Controls>
            <MiniMap
              style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10 }}
              nodeColor={(n) => {
                if (n.type === 'image') return '#0ea5e9'
                if (n.type === 'website') return '#10b981'
                if (n.type === 'sticky_comment') return '#fbbf24'
                return '#6366f1'
              }}
            />
          </ReactFlow>

          <CommentPanel />
        </div>
      </div>

      {/* Share modal */}
      {shareOpen && canvas && (
        <ShareModal
          canvasId={canvasId!}
          canvasName={canvas.name}
          ownerEmail={canvas.owner_email}
          onClose={() => setShareOpen(false)}
        />
      )}
    </CanvasContext.Provider>
  )
}

function ToolbarButton({ onClick, label, color }: { onClick: () => void; label: string; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: `1.5px solid ${color}`, borderRadius: 8,
        color, fontSize: 12, fontWeight: 600, padding: '4px 12px', cursor: 'pointer',
        fontFamily: 'system-ui, sans-serif', transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${color}22`)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
    >
      {label}
    </button>
  )
}
