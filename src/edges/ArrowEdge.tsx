import { BaseEdge, getStraightPath, type EdgeProps } from '@xyflow/react'

export function ArrowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
}: EdgeProps) {
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY })
  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{ stroke: '#e5e7eb', strokeWidth: 3, ...style }}
      interactionWidth={20}
    />
  )
}
