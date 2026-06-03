import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
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
import { ArrowNode } from '../nodes/ArrowNode'
import { LabeledEdge } from '../edges/LabeledEdge'
import { ArrowEdge } from '../edges/ArrowEdge'
import { CommentPanel } from '../components/CommentPanel'
import { ShareModal } from '../components/ShareModal'
import { AgentBar } from '../components/AgentBar'
import { SortGridIcon, LockIcon, UnlockIcon, VectorToolIcon, ImageToolIcon, WebsiteToolIcon, ArrowToolIcon, StickyToolIcon } from '../components/icons'

const nodeTypes = {
  vector: VectorNode,
  image: ImageNode,
  website: WebsiteNode,
  sticky_comment: StickyCommentNode,
  arrow_anchor: ArrowAnchorNode,  // legacy — existing canvases with old arrow system
  arrow: ArrowNode,
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
    ...((n.type === 'arrow_anchor' || n.type === 'arrow') ? { zIndex: 100 } : {}),
  }
}

function toFlowEdge(e: DBEdge, nodeTypeMap: Map<string, string>): Edge {
  const isArrow =
    nodeTypeMap.get(e.source) === 'arrow_anchor' ||
    nodeTypeMap.get(e.target) === 'arrow_anchor'
  if (isArrow) {
    const color = e.label?.startsWith('#') ? e.label : '#e5e7eb'
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'arrow',
      zIndex: 99,
      data: { color },
      style: { stroke: color, strokeWidth: 3 },
      markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color },
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
  const [commentedIds, setCommentedIds] = useState<Set<string>>(new Set())
  const addCommentedId = useCallback((id: string) => {
    setCommentedIds((s) => new Set([...s, id]))
  }, [])
  const [shareOpen, setShareOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [isInteractive, setIsInteractive] = useState(true)
  const [canvasDragOver, setCanvasDragOver] = useState(false)
  const [preferredLang, setPreferredLangState] = useState<'en' | 'ko'>(
    () => (localStorage.getItem('preferredLang') as 'en' | 'ko') ?? 'en'
  )

  const isLoadedRef = useRef(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Refs so unload/navigate handlers always see the latest state
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  const canvasIdRef = useRef(canvasId)
  const isViewerRef = useRef(false)

  // ── History (undo/redo) ────────────────────────────────────────────────────
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([])
  const historyIndexRef = useRef(0)
  const isTimeTravelingRef = useRef(false)
  const suppressHistoryUntilRef = useRef(0)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const isViewer = userRole === 'viewer'

  // ── Context ────────────────────────────────────────────────────────────────
  const openThread = useCallback((parentType: 'node' | 'edge', parentId: string, nodeType?: string) => {
    setActiveThread({ parentType, parentId, nodeType })
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setActiveThread(null)
  }, [setNodes])

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
    commentedIds,
    addCommentedId,
    deleteNode,
  }), [canvasId, userRole, currentUserEmail, preferredLang, setPreferredLang, openThread, closeThread, activeThread, commentedIds, addCommentedId, deleteNode])

  // ── Load canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canvasId) return
    isLoadedRef.current = false
    Promise.all([
      fetch('/api/me').then((r) => r.json() as Promise<{ email: string }>),
      fetch(`/api/canvases/${canvasId}`).then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json() as Promise<{ canvas: CanvasData; nodes: DBNode[]; edges: DBEdge[]; commentedIds: string[] }>
      }),
    ])
      .then(([me, data]) => {
        setCurrentUserEmail(me.email)
        setCanvas(data.canvas)
        setUserRole((data.canvas.userRole as UserRole) ?? 'viewer')
        const nodeTypeMap = new Map<string, string>(
          data.nodes.map((n: DBNode) => [n.id, n.type])
        )
        setCommentedIds(new Set(data.commentedIds ?? []))
        const loadedNodes = data.nodes.map(toFlowNode)
        const loadedEdges = data.edges.map((e: DBEdge) => toFlowEdge(e, nodeTypeMap))
        setNodes(loadedNodes)
        setEdges(loadedEdges)
        // Seed history with the initial loaded state so users can always undo their first action
        historyRef.current = [{ nodes: loadedNodes, edges: loadedEdges }]
        historyIndexRef.current = 0
        requestAnimationFrame(() => { isLoadedRef.current = true })
      })
      .catch(() => navigate('/home'))
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
              // Arrow edges: store color in label column (arrow edges have no text label)
              label: e.type === 'arrow'
                ? ((e.data as { color?: string } | undefined)?.color ?? null)
                : (typeof e.label === 'string' ? e.label : null),
            })),
          }),
        })
        if (res.status === 403) { setSaveStatus('readonly'); return }
        if (!res.ok) { setSaveStatus('error'); return }
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      }
    }, 500)
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
      openThread('node', nodeId, 'sticky_comment')
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
    setNodes((nds) => [
      ...nds,
      {
        id: crypto.randomUUID(),
        type: 'arrow',
        position: { x: 150 + Math.random() * 250, y: 150 + Math.random() * 180 },
        data: { tailX: 10, tailY: 30, headX: 290, headY: 30, color: '#e5e7eb' },
        width: 300,
        height: 60,
        zIndex: 100,
      },
    ])
  }, [setNodes])

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

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      if (edge.type !== 'arrow') return
      // Select both anchor nodes so multi-drag moves the whole arrow
      setNodes((nds) =>
        nds.map((n) =>
          n.id === edge.source || n.id === edge.target ? { ...n, selected: true } : n
        )
      )
    },
    [setNodes],
  )

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (node.type === 'sticky_comment') openThread('node', node.id, 'sticky_comment')
    },
    [openThread],
  )

  // Keep refs current so unload/navigate handlers see the latest data
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  useEffect(() => { edgesRef.current = edges }, [edges])
  useEffect(() => { canvasIdRef.current = canvasId }, [canvasId])
  useEffect(() => { isViewerRef.current = isViewer }, [isViewer])

  // Synchronous save using current ref values — safe to call from unload/navigate
  const saveNow = useCallback(() => {
    if (!isLoadedRef.current || !canvasIdRef.current || isViewerRef.current) return
    clearTimeout(saveTimerRef.current)
    const payload = JSON.stringify({
      nodes: nodesRef.current.map((n) => ({
        id: n.id, type: n.type ?? 'vector',
        x: n.position.x, y: n.position.y,
        width: n.measured?.width ?? null, height: n.measured?.height ?? null,
        data: n.data,
      })),
      edges: edgesRef.current.map((e) => ({
        id: e.id, source: e.source, target: e.target,
        label: e.type === 'arrow'
          ? ((e.data as { color?: string } | undefined)?.color ?? null)
          : (typeof e.label === 'string' ? e.label : null),
      })),
    })
    // keepalive survives tab/window close
    fetch(`/api/canvases/${canvasIdRef.current}/state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: payload,
    }).catch(() => {})
  }, [])

  // Save on browser tab/window close or hard navigation
  useEffect(() => {
    const handler = () => saveNow()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveNow])

  // Clear drag overlay whenever any drop completes (including drops caught by child nodes)
  useEffect(() => {
    const handler = () => setCanvasDragOver(false)
    window.addEventListener('drop', handler)
    return () => window.removeEventListener('drop', handler)
  }, [])

  // ── Canvas-level image drop → creates ImageNode ───────────────────────────
  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    setCanvasDragOver(true)
  }, [])

  const handleCanvasDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear when leaving the entire canvas area
    if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as HTMLElement)) return
    setCanvasDragOver(false)
  }, [])

  const handleCanvasDrop = useCallback(async (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    e.stopPropagation()
    setCanvasDragOver(false)
    if (isViewer) return

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (!files.length) return

    let dropPos = screenToFlowPosition({ x: e.clientX, y: e.clientY })

    for (const file of files) {
      const nodeId = crypto.randomUUID()
      const pos = { ...dropPos }

      // Place node immediately so the user sees it appear
      setNodes(nds => [...nds, { id: nodeId, type: 'image', position: pos, data: {} }])

      const formData = new FormData()
      formData.append('file', file)
      fetch('/api/upload', { method: 'POST', body: formData })
        .then(r => r.json())
        .then((json: unknown) => {
          setNodes(nds => nds.map(n =>
            n.id === nodeId ? { ...n, data: { imageUrl: (json as { url: string }).url } } : n
          ))
        })

      dropPos = { x: dropPos.x + 240, y: dropPos.y }
    }
  }, [isViewer, screenToFlowPosition, setNodes])

  // ── History push (debounced) ───────────────────────────────────────────────
  useEffect(() => {
    if (!isLoadedRef.current || isTimeTravelingRef.current) return
    clearTimeout(historyTimerRef.current)
    historyTimerRef.current = setTimeout(() => {
      if (Date.now() < suppressHistoryUntilRef.current) return
      const snapshot = { nodes: [...nodes], edges: [...edges] }
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
      historyRef.current.push(snapshot)
      if (historyRef.current.length > 50) historyRef.current.shift()
      historyIndexRef.current = historyRef.current.length - 1
    }, 600)
  }, [nodes, edges])

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current--
    isTimeTravelingRef.current = true
    suppressHistoryUntilRef.current = Date.now() + 900
    const snap = historyRef.current[historyIndexRef.current]
    setNodes([...snap.nodes])
    setEdges([...snap.edges])
    requestAnimationFrame(() => { isTimeTravelingRef.current = false })
  }, [setNodes, setEdges])

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current++
    isTimeTravelingRef.current = true
    suppressHistoryUntilRef.current = Date.now() + 900
    const snap = historyRef.current[historyIndexRef.current]
    setNodes([...snap.nodes])
    setEdges([...snap.edges])
    requestAnimationFrame(() => { isTimeTravelingRef.current = false })
  }, [setNodes, setEdges])

  // ── Canvas-level paste → selected ImageNode ────────────────────────────────
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (isViewer) return
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      const selectedImg = nodes.find(n => n.type === 'image' && n.selected)
      if (!selectedImg) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) break
          e.preventDefault()
          const formData = new FormData()
          formData.append('file', file)
          const res = await fetch('/api/upload', { method: 'POST', body: formData })
          const json = await res.json() as { url: string }
          setNodes(nds => nds.map(n =>
            n.id === selectedImg.id ? { ...n, data: { ...n.data, imageUrl: json.url } } : n
          ))
          break
        }
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [nodes, setNodes, isViewer])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Undo / Redo (skip when in a text field to let native undo work)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !inInput) {
        e.preventDefault(); undo(); return
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !inInput) {
        e.preventDefault(); redo(); return
      }

      // Escape: always close panels regardless of role or focus state
      if (e.key === 'Escape') {
        closeThread()
        setShareOpen(false)
        setEditingName(false)
        return
      }

      if (inInput || isViewer) return

      // Node add shortcuts
      if (e.key === 'v' || e.key === 'V') { e.preventDefault(); addNode('vector') }
      if (e.key === 'i' || e.key === 'I') { e.preventDefault(); addNode('image') }
      if (e.key === 'w' || e.key === 'W') { e.preventDefault(); addNode('website') }
      if (e.key === 'a' || e.key === 'A') { e.preventDefault(); addArrow() }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        const nodeId = crypto.randomUUID()
        setNodes(nds => [...nds, { id: nodeId, type: 'sticky_comment', position: { x: 200 + Math.random() * 400, y: 150 + Math.random() * 250 }, data: {} }])
        openThread('node', nodeId, 'sticky_comment')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [undo, redo, addNode, addArrow, setNodes, openThread, closeThread, isViewer])

  // ── Agent: reposition existing nodes OR add new ones ──────────────────────
  const addAgentContent = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    if (!newNodes.length && !newEdges.length) return
    setNodes(existing => {
      const existingIdSet = new Set(existing.map(n => n.id))
      const updates = newNodes.filter(n => existingIdSet.has(n.id))   // reposition
      const additions = newNodes.filter(n => !existingIdSet.has(n.id)) // brand-new

      // Apply position (and optional size) updates to existing nodes
      let result = existing.map(n => {
        const u = updates.find(x => x.id === n.id)
        if (!u) return n
        return {
          ...n,
          position: u.position,
          ...(u.width ? { width: u.width } : {}),
          ...(u.height ? { height: u.height } : {}),
        }
      })

      // Add genuinely new nodes (shift existing right if they'd overlap)
      if (additions.length) {
        const newRight = Math.max(...additions.map(n => n.position.x + ((n.width as number | undefined) ?? 200)))
        const newLeft = Math.min(...additions.map(n => n.position.x))
        const overlap = result.some(n => n.position.x < newRight + 60 && n.position.x > newLeft - 60)
        if (overlap) result = result.map(n => ({ ...n, position: { x: n.position.x + newRight + 100, y: n.position.y } }))
        result = [...result, ...additions]
      }

      return result
    })
    setEdges(existing => {
      const existingIds = new Set(existing.map(e => e.id))
      return [...existing, ...newEdges.filter(e => !existingIds.has(e.id))]
    })
  }, [setNodes, setEdges])

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
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', background: '#030712', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* Header */}
        <div style={{ height: 48, background: '#030712', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', flexShrink: 0, zIndex: 10 }}>
          <button
            onClick={() => { saveNow(); navigate('/home') }}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, padding: '4px 8px', borderRadius: 6 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
          >
            ← Home
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

          {/* Save status dot + label */}
          {!isViewer && saveStatus !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: statusColor[saveStatus],
                animation: saveStatus === 'pending' || saveStatus === 'saving' ? 'pulse 1.2s ease-in-out infinite' : 'none',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: statusColor[saveStatus], fontFamily: 'system-ui, sans-serif' }}>
                {statusLabel[saveStatus]}
              </span>
            </div>
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

          {/* Add node icon toolbar — hidden for viewers */}
          {!isViewer && (
            <>
              <div style={{ width: 1, height: 22, background: '#1f2937', margin: '0 4px' }} />
              <div style={{ display: 'flex', gap: 3 }}>
                <IconToolButton onClick={() => addNode('vector')} icon={<VectorToolIcon />} labelEn="Vector" labelKo="벡터" shortcut="V" color="#6366f1" />
                <IconToolButton onClick={() => addNode('image')} icon={<ImageToolIcon />} labelEn="Image" labelKo="이미지" shortcut="I" color="#0ea5e9" />
                <IconToolButton onClick={() => addNode('website')} icon={<WebsiteToolIcon />} labelEn="Website" labelKo="웹사이트" shortcut="W" color="#10b981" />
                <IconToolButton onClick={addArrow} icon={<ArrowToolIcon />} labelEn="Arrow" labelKo="화살표" shortcut="A" color="#94a3b8" />
                <IconToolButton
                  onClick={() => {
                    const nodeId = crypto.randomUUID()
                    setNodes((nds) => [...nds, { id: nodeId, type: 'sticky_comment', position: { x: 200 + Math.random() * 300, y: 150 + Math.random() * 200 }, data: {} }])
                    openThread('node', nodeId, 'sticky_comment')
                  }}
                  icon={<StickyToolIcon />}
                  labelEn="Sticky Note"
                  labelKo="스티커"
                  shortcut="S"
                  color="#fbbf24"
                />
              </div>
            </>
          )}
        </div>

        {/* Canvas + panel */}
        <div
          style={{ flex: 1, position: 'relative' }}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
          onDoubleClick={(e) => {
            const t = e.target as HTMLElement
            if (
              t.closest('.react-flow__node') ||
              t.closest('.react-flow__edge') ||
              t.closest('.react-flow__panel') ||
              t.tagName === 'INPUT' ||
              t.tagName === 'TEXTAREA' ||
              (t as HTMLElement).isContentEditable
            ) return
            onPaneDoubleClick(e)
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={isViewer ? undefined : onConnect}
            onEdgeClick={onEdgeClick}
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
            multiSelectionKeyCode="Shift"
            selectionKeyCode="Meta"
            panOnDrag={true}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.2, minZoom: 0.3 }}
            style={{ background: '#030712' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1f2937" />
            <Controls
              showInteractive={false}
              style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10 }}
            >
              <ControlButton onClick={undo} title="Undo (⌘Z)">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 4h7a3 3 0 0 1 0 6H5M1 4l3-3M1 4l3 3"/>
                </svg>
              </ControlButton>
              <ControlButton onClick={redo} title="Redo (⌘⇧Z)">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a3 3 0 0 0 0 6h3M11 4L8 1M11 4L8 7"/>
                </svg>
              </ControlButton>
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

          {/* Drop overlay */}
          {canvasDragOver && !isViewer && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 25,
              border: '2px dashed #6366f1',
              background: 'rgba(99,102,241,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                background: 'rgba(7,10,18,0.88)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(99,102,241,0.4)',
                borderRadius: 14,
                padding: '14px 24px',
                color: '#818cf8',
                fontSize: 14,
                fontWeight: 600,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                Drop image to add to canvas
              </div>
            </div>
          )}

          {/* AI Agent bar — floating, bottom center */}
          {!isViewer && canvasId && (
            <AgentBar
              canvasId={canvasId}
              currentNodes={nodes}
              currentEdges={edges}
              onAddContent={addAgentContent}
            />
          )}
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

function IconToolButton({
  onClick, icon, labelEn, labelKo, shortcut, color,
}: {
  onClick: () => void
  icon: React.ReactNode
  labelEn: string
  labelKo: string
  shortcut?: string
  color: string
}) {
  const [tip, setTip] = useState(false)
  const tipTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const showTip = () => {
    clearTimeout(tipTimer.current)
    tipTimer.current = window.setTimeout(() => setTip(true), 450)
  }
  const hideTip = () => {
    clearTimeout(tipTimer.current)
    setTip(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        style={{
          width: 32, height: 32, background: 'transparent',
          border: `1.5px solid ${color}44`, borderRadius: 8,
          color, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.12s, border-color 0.12s',
          fontFamily: 'system-ui, sans-serif',
        }}
        onFocus={showTip}
        onBlur={hideTip}
      >
        {icon}
      </button>
      {tip && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: '#0d1117', border: '1px solid #374151',
          borderRadius: 8, padding: '5px 10px', zIndex: 999,
          whiteSpace: 'nowrap', pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 11, color: '#f9fafb', fontWeight: 600 }}>{labelEn}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{labelKo}</div>
          {shortcut && (
            <div style={{ marginTop: 3, display: 'flex', justifyContent: 'center' }}>
              <kbd style={{ fontSize: 9, color: '#4b5563', background: '#1f2937', border: '1px solid #374151', borderRadius: 4, padding: '1px 5px', fontFamily: 'system-ui, sans-serif' }}>{shortcut}</kbd>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
