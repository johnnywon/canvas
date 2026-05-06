import { useCallback } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  MarkerType,
  getStraightPath,
  useReactFlow,
  type EdgeProps,
  type EdgeMarker,
} from '@xyflow/react'

const COLORS = [
  '#e5e7eb', // white-ish (default)
  '#60a5fa', // blue
  '#f87171', // red
  '#34d399', // green
  '#fbbf24', // amber
  '#c084fc', // purple
]

export function ArrowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  selected,
  data,
}: EdgeProps) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  const { setEdges } = useReactFlow()

  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2

  const currentColor = (data as { color?: string } | undefined)?.color ?? '#e5e7eb'

  const changeColor = useCallback(
    (color: string) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== id) return e
          return {
            ...e,
            data: { ...(e.data as object), color },
            style: { ...(e.style as object), stroke: color },
            markerEnd: {
              ...((e.markerEnd ?? {}) as EdgeMarker),
              type: MarkerType.ArrowClosed,
              width: 22,
              height: 22,
              color,
            },
          }
        })
      )
    },
    [id, setEdges],
  )

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: currentColor, strokeWidth: 3, ...style }}
        interactionWidth={24}
      />

      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, calc(-100% - 10px)) translate(${midX}px, ${midY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              gap: 5,
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 10,
              padding: '5px 7px',
            }}
            className="nodrag nopan"
          >
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => changeColor(c)}
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: c,
                  border: c === currentColor ? '2.5px solid white' : '2px solid rgba(255,255,255,0.15)',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
