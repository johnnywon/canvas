/**
 * Tests for canvas keyboard shortcuts: Cmd+D duplicate, arrow key nudge.
 * These are pure logic tests — no React rendering needed.
 * We test the transformation logic directly, not the full editor.
 */
import { describe, it, expect } from 'vitest'
import type { Node } from '@xyflow/react'

// --- helpers that mirror the CanvasEditor logic ---

function duplicateSelected(nodes: Node[]): Node[] {
  const selected = nodes.filter(n => n.selected && n.type !== 'arrow_anchor')
  if (selected.length === 0) return nodes

  const dupes = selected.map(n => ({
    ...n,
    id: `${n.id}-copy`,
    position: { x: n.position.x + 24, y: n.position.y + 24 },
    selected: true,
    data: { ...(n.data as Record<string, unknown>), autoEdit: undefined },
  }))

  return [
    ...nodes.map(n => ({ ...n, selected: false })),
    ...dupes,
  ]
}

function nudgeSelected(nodes: Node[], dx: number, dy: number): Node[] {
  return nodes.map(n =>
    n.selected
      ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } }
      : n
  )
}

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'n1',
    type: 'vector',
    position: { x: 100, y: 100 },
    data: {},
    selected: false,
    ...overrides,
  } as Node
}

// --- tests ---

describe('Cmd+D duplicate', () => {
  it('duplicates a selected node at +24/+24 offset', () => {
    const nodes = [makeNode({ id: 'a', selected: true, position: { x: 50, y: 80 } })]
    const result = duplicateSelected(nodes)

    expect(result).toHaveLength(2)
    const copy = result.find(n => n.id === 'a-copy')!
    expect(copy.position).toEqual({ x: 74, y: 104 })
  })

  it('deselects originals and selects copies', () => {
    const nodes = [makeNode({ id: 'a', selected: true })]
    const result = duplicateSelected(nodes)

    expect(result.find(n => n.id === 'a')!.selected).toBe(false)
    expect(result.find(n => n.id === 'a-copy')!.selected).toBe(true)
  })

  it('duplicates multiple selected nodes independently', () => {
    const nodes = [
      makeNode({ id: 'a', selected: true, position: { x: 10, y: 20 } }),
      makeNode({ id: 'b', selected: true, position: { x: 200, y: 300 } }),
    ]
    const result = duplicateSelected(nodes)

    expect(result).toHaveLength(4)
    expect(result.find(n => n.id === 'a-copy')!.position).toEqual({ x: 34, y: 44 })
    expect(result.find(n => n.id === 'b-copy')!.position).toEqual({ x: 224, y: 324 })
  })

  it('does not duplicate unselected nodes', () => {
    const nodes = [
      makeNode({ id: 'a', selected: true }),
      makeNode({ id: 'b', selected: false }),
    ]
    const result = duplicateSelected(nodes)

    expect(result).toHaveLength(3)
    expect(result.find(n => n.id === 'b-copy')).toBeUndefined()
  })

  it('skips arrow_anchor nodes even if selected', () => {
    const nodes = [
      makeNode({ id: 'a', selected: true, type: 'vector' }),
      makeNode({ id: 'anchor', selected: true, type: 'arrow_anchor' }),
    ]
    const result = duplicateSelected(nodes)

    expect(result.find(n => n.id === 'anchor-copy')).toBeUndefined()
    expect(result.find(n => n.id === 'a-copy')).toBeDefined()
  })

  it('strips autoEdit flag from duplicated data', () => {
    const nodes = [makeNode({ id: 'a', selected: true, data: { autoEdit: true, text: 'hi' } })]
    const result = duplicateSelected(nodes)

    const copy = result.find(n => n.id === 'a-copy')!
    expect((copy.data as Record<string, unknown>).autoEdit).toBeUndefined()
    expect((copy.data as Record<string, unknown>).text).toBe('hi')
  })

  it('returns nodes unchanged when nothing is selected', () => {
    const nodes = [makeNode({ id: 'a', selected: false })]
    const result = duplicateSelected(nodes)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
  })
})

describe('Arrow key nudge', () => {
  it('moves selected nodes by the given delta', () => {
    const nodes = [makeNode({ id: 'a', selected: true, position: { x: 100, y: 100 } })]
    const result = nudgeSelected(nodes, -1, 0)
    expect(result[0].position).toEqual({ x: 99, y: 100 })
  })

  it('moves right (+1 x)', () => {
    const nodes = [makeNode({ id: 'a', selected: true, position: { x: 50, y: 50 } })]
    expect(nudgeSelected(nodes, 1, 0)[0].position).toEqual({ x: 51, y: 50 })
  })

  it('moves up (-1 y)', () => {
    const nodes = [makeNode({ id: 'a', selected: true, position: { x: 50, y: 50 } })]
    expect(nudgeSelected(nodes, 0, -1)[0].position).toEqual({ x: 50, y: 49 })
  })

  it('moves down (+1 y)', () => {
    const nodes = [makeNode({ id: 'a', selected: true, position: { x: 50, y: 50 } })]
    expect(nudgeSelected(nodes, 0, 1)[0].position).toEqual({ x: 50, y: 51 })
  })

  it('shift nudge moves 10px', () => {
    const nodes = [makeNode({ id: 'a', selected: true, position: { x: 0, y: 0 } })]
    expect(nudgeSelected(nodes, 10, 0)[0].position).toEqual({ x: 10, y: 0 })
  })

  it('does not move unselected nodes', () => {
    const nodes = [
      makeNode({ id: 'a', selected: true, position: { x: 100, y: 100 } }),
      makeNode({ id: 'b', selected: false, position: { x: 200, y: 200 } }),
    ]
    const result = nudgeSelected(nodes, 5, 5)
    expect(result.find(n => n.id === 'a')!.position).toEqual({ x: 105, y: 105 })
    expect(result.find(n => n.id === 'b')!.position).toEqual({ x: 200, y: 200 })
  })

  it('moves all selected nodes simultaneously', () => {
    const nodes = [
      makeNode({ id: 'a', selected: true, position: { x: 10, y: 10 } }),
      makeNode({ id: 'b', selected: true, position: { x: 100, y: 200 } }),
    ]
    const result = nudgeSelected(nodes, -1, -1)
    expect(result.find(n => n.id === 'a')!.position).toEqual({ x: 9, y: 9 })
    expect(result.find(n => n.id === 'b')!.position).toEqual({ x: 99, y: 199 })
  })
})
