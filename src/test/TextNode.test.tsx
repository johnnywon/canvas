import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextNode } from '../nodes/TextNode'
import { CanvasContext } from '../contexts/CanvasContext'

const mockUpdateNodeData = vi.fn()
const mockDeleteElements = vi.fn()

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ updateNodeData: mockUpdateNodeData, deleteElements: mockDeleteElements }),
  Handle: () => null,
  NodeResizer: () => null,
  Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
}))

const ctxValue = {
  canvasId: 'test',
  userRole: 'owner' as const,
  currentUserEmail: 'test@test.com',
  preferredLang: 'en' as const,
  setPreferredLang: vi.fn(),
  openThread: vi.fn(),
  closeThread: vi.fn(),
  activeThread: null,
  commentedIds: new Set<string>(),
  addCommentedId: vi.fn(),
  deleteNode: vi.fn(),
}

function renderNode(data = {}, selected = false) {
  return render(
    <CanvasContext.Provider value={ctxValue}>
      <TextNode
        id="node-1"
        data={data}
        selected={selected}
        xPos={0} yPos={0}
        zIndex={0}
        isConnectable={true}
        dragging={false}
        type="text"
        positionAbsoluteX={0} positionAbsoluteY={0}
      />
    </CanvasContext.Provider>
  )
}

describe('TextNode', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('defaults', () => {
    it('renders with default font size 18 when none provided', () => {
      renderNode({ text: 'hello' })
      const text = screen.getByText('hello')
      expect(text.style.fontSize).toBe('18px')
    })

    it('shows placeholder when selected and no text', () => {
      renderNode({}, true)
      expect(screen.getByText('Double-click to edit')).toBeInTheDocument()
    })

    it('hides placeholder when not selected and no text', () => {
      renderNode({}, false)
      expect(screen.queryByText('Double-click to edit')).not.toBeInTheDocument()
    })
  })

  describe('text editing', () => {
    it('enters edit mode on double-click', async () => {
      const user = userEvent.setup()
      renderNode({ text: 'hello' }, true)
      await user.dblClick(screen.getByText('hello'))
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('commits text on blur', async () => {
      const user = userEvent.setup()
      renderNode({ text: 'old' }, true)
      await user.dblClick(screen.getByText('old'))
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'new text')
      fireEvent.blur(input)
      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { text: 'new text' })
    })

    it('saves undefined when text is cleared (removes empty node label)', async () => {
      const user = userEvent.setup()
      renderNode({ text: 'delete me' }, true)
      await user.dblClick(screen.getByText('delete me'))
      const input = screen.getByRole('textbox')
      await user.clear(input)
      fireEvent.blur(input)
      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { text: undefined })
    })

    it('cancels on Escape without saving', async () => {
      const user = userEvent.setup()
      renderNode({ text: 'keep me' }, true)
      await user.dblClick(screen.getByText('keep me'))
      const input = screen.getByRole('textbox')
      await user.clear(input)
      await user.type(input, 'discard')
      await user.keyboard('{Escape}')
      expect(mockUpdateNodeData).not.toHaveBeenCalled()
      expect(screen.getByText('keep me')).toBeInTheDocument()
    })
  })

  describe('auto-edit on creation', () => {
    it('enters edit mode when autoEdit flag is set', async () => {
      await act(async () => {
        renderNode({ autoEdit: true })
      })
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('clears autoEdit flag from node data on mount', async () => {
      await act(async () => {
        renderNode({ autoEdit: true })
      })
      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { autoEdit: undefined })
    })
  })

  describe('font size toolbar', () => {
    it('shows font size buttons when selected', () => {
      renderNode({ text: 'hi' }, true)
      expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument()
    })

    it('updates fontSize when size button clicked', async () => {
      const user = userEvent.setup()
      renderNode({ text: 'hi', fontSize: 18 }, true)
      await user.click(screen.getByRole('button', { name: 'L' }))
      expect(mockUpdateNodeData).toHaveBeenCalledWith('node-1', { fontSize: 24 })
    })
  })
})
