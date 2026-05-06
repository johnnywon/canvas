import { useRef, useState } from 'react'
import { NodeResizer, useReactFlow, type NodeProps } from '@xyflow/react'

export type ArrowNodeData = {
  tailX: number
  tailY: number
  headX: number
  headY: number
  color: string
}

const COLORS = ['#e5e7eb', '#60a5fa', '#f87171', '#34d399', '#fbbf24', '#c084fc']

export function ArrowNode({ id, data, selected }: NodeProps) {
  const { updateNodeData, getViewport } = useReactFlow()
  const d = data as ArrowNodeData

  const tailX = d.tailX ?? 10
  const tailY = d.tailY ?? 30
  const headX = d.headX ?? 290
  const headY = d.headY ?? 30
  const color = d.color ?? '#e5e7eb'

  const [showColors, setShowColors] = useState(false)
  const dragRef = useRef<{ which: 'tail' | 'head'; lastX: number; lastY: number } | null>(null)

  const midX = (tailX + headX) / 2
  const midY = (tailY + headY) / 2

  const onHandlePointerDown = (e: React.PointerEvent, which: 'tail' | 'head') => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { which, lastX: e.clientX, lastY: e.clientY }
  }

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const { zoom } = getViewport()
    const dx = (e.clientX - dragRef.current.lastX) / zoom
    const dy = (e.clientY - dragRef.current.lastY) / zoom
    dragRef.current = { ...dragRef.current, lastX: e.clientX, lastY: e.clientY }

    if (dragRef.current.which === 'tail') {
      updateNodeData(id, { tailX: tailX + dx, tailY: tailY + dy })
    } else {
      updateNodeData(id, { headX: headX + dx, headY: headY + dy })
    }
  }

  const onHandlePointerUp = () => {
    dragRef.current = null
  }

  const markerId = `ah-${id.replace(/-/g, '')}`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        pointerEvents: 'none',
        minWidth: 60,
        minHeight: 30,
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={60}
        minHeight={30}
        handleStyle={{ width: 10, height: 10, background: '#475569', border: '2px solid #e5e7eb', borderRadius: 2 }}
        lineStyle={{ borderColor: '#334155', borderWidth: 1, borderStyle: 'dashed' }}
      />

      {/* Arrow SVG — wide transparent stroke makes the line grabbable */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
          </marker>
        </defs>

        {/* Wide transparent hit area for dragging the whole arrow */}
        <line
          x1={tailX} y1={tailY} x2={headX} y2={headY}
          stroke="transparent"
          strokeWidth="32"
          style={{ pointerEvents: 'stroke', cursor: 'grab' }}
        />

        {/* Visible arrow */}
        <line
          x1={tailX} y1={tailY} x2={headX} y2={headY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
          style={{ pointerEvents: 'none' }}
        />
      </svg>

      {/* Tail handle */}
      <Handle type="tail" x={tailX} y={tailY} color={color} selected={!!selected}
        onPointerDown={(e) => onHandlePointerDown(e, 'tail')}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
      />

      {/* Head handle */}
      <Handle type="head" x={headX} y={headY} color={color} selected={!!selected}
        onPointerDown={(e) => onHandlePointerDown(e, 'head')}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
      />

      {/* Color picker (shows when selected) */}
      {selected && (
        <div
          style={{
            position: 'absolute',
            left: midX,
            top: midY,
            transform: 'translate(-50%, calc(-100% - 14px))',
            pointerEvents: 'all',
            display: 'flex',
            gap: 5,
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 10,
            padding: '5px 7px',
            zIndex: 10,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setShowColors(true)}
          onMouseLeave={() => setShowColors(false)}
        >
          {showColors || true ? COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateNodeData(id, { color: c })}
              style={{
                width: 15, height: 15, borderRadius: '50%',
                background: c, padding: 0,
                border: c === color ? '2.5px solid white' : '2px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', flexShrink: 0,
              }}
            />
          )) : null}
        </div>
      )}
    </div>
  )
}

function Handle({
  type, x, y, color, selected,
  onPointerDown, onPointerMove, onPointerUp,
}: {
  type: 'tail' | 'head'
  x: number; y: number
  color: string
  selected: boolean
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
}) {
  return (
    <div
      className="nodrag nopan"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      title={type === 'tail' ? 'Drag to move tail' : 'Drag to move head'}
      style={{
        position: 'absolute',
        left: x - 9,
        top: y - 9,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: type === 'head' ? color : '#475569',
        border: `2.5px solid ${selected ? 'white' : '#94a3b8'}`,
        cursor: 'grab',
        pointerEvents: 'all',
        boxShadow: selected ? '0 0 0 3px rgba(255,255,255,0.15)' : '0 1px 4px rgba(0,0,0,0.5)',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        zIndex: 2,
        touchAction: 'none',
      }}
    />
  )
}
