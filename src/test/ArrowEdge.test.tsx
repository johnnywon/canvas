import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArrowEdge } from '../edges/ArrowEdge'
import { Position } from '@xyflow/react'

const mockSetEdges = vi.fn()
const mockDeleteElements = vi.fn()

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>()
  return {
    ...actual,
    useReactFlow: () => ({ setEdges: mockSetEdges, deleteElements: mockDeleteElements }),
    // Render outside SVG so inputs are proper HTML elements
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="edge-label-renderer">{children}</div>
    ),
    getBezierPath: () => ['M 0 0 L 100 100', 50, 50],
  }
})

const defaultProps = {
  id: 'edge-1',
  sourceX: 0, sourceY: 0, targetX: 100, targetY: 100,
  sourcePosition: Position.Right, targetPosition: Position.Left,
  data: {}, selected: false,
  source: 'node-1', target: 'node-2',
  sourceHandleId: null, targetHandleId: null,
  animated: false, label: undefined,
  markerEnd: undefined, markerStart: undefined,
  style: undefined, interactionWidth: 20,
}

// Wrap in a foreign object so SVG paths render correctly but DOM elements are HTML
function Wrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

describe('ArrowEdge', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('label editing', () => {
    it('shows "Add label" hint when selected', () => {
      render(<Wrapper><ArrowEdge {...defaultProps} selected={true} /></Wrapper>)
      expect(screen.getByText('Add label')).toBeInTheDocument()
    })

    it('enters edit mode on double-click', async () => {
      const user = userEvent.setup()
      render(<Wrapper><ArrowEdge {...defaultProps} selected={true} /></Wrapper>)
      await user.dblClick(screen.getByText('Add label').parentElement!)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('commits label on blur, trimming whitespace', async () => {
      const user = userEvent.setup()
      render(<Wrapper><ArrowEdge {...defaultProps} selected={true} data={{ label: 'old' }} /></Wrapper>)

      await user.dblClick(screen.getByText('old').parentElement!)
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, '  new label  ')
      fireEvent.blur(input)

      const updater = mockSetEdges.mock.calls[0][0]
      expect(updater([{ id: 'edge-1', data: {} }])[0].data.label).toBe('new label')
    })

    it('commits empty string as undefined, removing the label', async () => {
      const user = userEvent.setup()
      render(<Wrapper><ArrowEdge {...defaultProps} selected={true} data={{ label: 'remove me' }} /></Wrapper>)

      await user.dblClick(screen.getByText('remove me').parentElement!)
      const input = screen.getByRole('textbox')
      await user.clear(input)
      fireEvent.blur(input)

      const updater = mockSetEdges.mock.calls[0][0]
      expect(updater([{ id: 'edge-1', data: {} }])[0].data.label).toBeUndefined()
    })

    it('cancels on Escape, restoring original label without saving', async () => {
      const user = userEvent.setup()
      render(<Wrapper><ArrowEdge {...defaultProps} selected={true} data={{ label: 'original' }} /></Wrapper>)

      await user.dblClick(screen.getByText('original').parentElement!)
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'changed')
      await user.keyboard('{Escape}')

      expect(mockSetEdges).not.toHaveBeenCalled()
      expect(screen.getByText('original')).toBeInTheDocument()
    })
  })

  describe('color picker', () => {
    it('updates edge color when swatch clicked', async () => {
      const user = userEvent.setup()
      render(<Wrapper><ArrowEdge {...defaultProps} selected={true} /></Wrapper>)

      // Find color swatches — round buttons with no text
      const swatches = screen.getAllByRole('button').filter(
        btn => getComputedStyle(btn).borderRadius === '50%' || btn.style.borderRadius === '50%'
      ).filter(btn => !btn.textContent?.trim())

      await user.click(swatches[1]) // blue (#60a5fa)

      const updater = mockSetEdges.mock.calls[0][0]
      expect(updater([{ id: 'edge-1', data: {} }])[0].data.color).toBe('#60a5fa')
    })
  })

  describe('delete', () => {
    it('calls deleteElements with the edge id when ✕ clicked', async () => {
      const user = userEvent.setup()
      render(<Wrapper><ArrowEdge {...defaultProps} selected={true} /></Wrapper>)

      await user.click(screen.getByRole('button', { name: '✕' }))

      expect(mockDeleteElements).toHaveBeenCalledWith({ edges: [{ id: 'edge-1' }] })
    })
  })
})
