import { useCallback, useEffect, useRef, useState } from 'react'
import { MarkerType, type Edge, type Node } from '@xyflow/react'

type AgentMsg = {
  role: 'user' | 'assistant'
  // API format (may include image blocks)
  content: string | Array<{ type: string; [k: string]: unknown }>
  // Display text
  text: string
  imagePreview?: string
  canvasUpdated?: boolean
}

type CanvasBlock = { nodes: Node[]; edges: Edge[] }

function parseCanvasBlock(text: string): CanvasBlock | null {
  const match = text.match(/```canvas\n([\s\S]+?)\n```/)
  if (!match) return null
  try {
    const data = JSON.parse(match[1]) as { nodes?: Node[]; edges?: Edge[] }
    return { nodes: data.nodes ?? [], edges: data.edges ?? [] }
  } catch {
    return null
  }
}

function replyDisplay(text: string): string {
  return text.replace(/```canvas[\s\S]+?```/g, '').trim()
}

type Props = {
  canvasId: string
  onAddContent: (nodes: Node[], edges: Edge[]) => void
}

export function AgentBar({ canvasId, onAddContent }: Props) {
  const [messages, setMessages] = useState<AgentMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [imageAttachment, setImageAttachment] = useState<{ base64: string; mimeType: string; preview: string } | null>(null)

  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0

  const show = useCallback(() => {
    setVisible(true)
    clearTimeout(hideTimerRef.current)
  }, [])

  const scheduleHide = useCallback(() => {
    if (loading || hasMessages) return
    clearTimeout(hideTimerRef.current)
    hideTimerRef.current = window.setTimeout(() => setVisible(false), 3500)
  }, [loading, hasMessages])

  // Keep visible while loading or has history
  useEffect(() => {
    if (loading || hasMessages) {
      setVisible(true)
      clearTimeout(hideTimerRef.current)
    }
  }, [loading, hasMessages])

  // Scroll history to bottom
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight
  }, [messages.length])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string
          setImageAttachment({
            base64: dataUrl.split(',')[1],
            mimeType: item.type,
            preview: dataUrl,
          })
        }
        reader.readAsDataURL(file)
        e.preventDefault()
        break
      }
    }
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text && !imageAttachment) return
    if (loading) return

    // Build API content
    const apiContent: AgentMsg['content'] = imageAttachment
      ? [
          { type: 'image', source: { type: 'base64', media_type: imageAttachment.mimeType, data: imageAttachment.base64 } },
          { type: 'text', text: text || 'Create a canvas diagram from this image' },
        ]
      : text

    const userMsg: AgentMsg = {
      role: 'user',
      content: apiContent,
      text: text || '📎 Image attached',
      imagePreview: imageAttachment?.preview,
    }

    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setImageAttachment(null)
    setLoading(true)

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasId,
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const { reply } = await res.json() as { reply: string }
      const block = parseCanvasBlock(reply)

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        text: replyDisplay(reply) || 'Done.',
        canvasUpdated: !!block,
      }])

      if (block) {
        const styledEdges = block.edges.map(e => ({
          ...e,
          type: 'labeled' as const,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
        }))
        onAddContent(block.nodes, styledEdges)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error', text: 'Something went wrong. Try again.' }])
    } finally {
      setLoading(false)
    }
  }, [input, imageAttachment, loading, messages, canvasId, onAddContent])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (e.key === 'Escape') {
      setVisible(false)
      clearTimeout(hideTimerRef.current)
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
      onMouseEnter={show}
      onMouseLeave={scheduleHide}
    >
      {/* Conversation history — above the bar */}
      {visible && messages.length > 0 && (
        <div
          ref={historyRef}
          style={{
            width: 480,
            maxHeight: 280,
            overflowY: 'auto',
            marginBottom: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            pointerEvents: 'all',
          }}
        >
          {messages.slice(-10).map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '80%',
                background: m.role === 'user' ? 'rgba(99,102,241,0.25)' : 'rgba(17,24,39,0.82)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${m.role === 'user' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: m.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                padding: '7px 12px',
              }}>
                {m.imagePreview && (
                  <img src={m.imagePreview} alt="" style={{ display: 'block', maxWidth: 160, maxHeight: 100, borderRadius: 6, marginBottom: 4, objectFit: 'cover' }} />
                )}
                <p style={{ margin: 0, fontSize: 12, color: '#e5e7eb', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.text}
                </p>
                {m.canvasUpdated && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 10, color: '#818cf8', fontWeight: 600 }}>
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="#818cf8"><circle cx="4" cy="4" r="4"/></svg>
                    Canvas updated
                  </span>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: 'rgba(17,24,39,0.82)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '4px 14px 14px 14px',
                padding: '10px 14px',
                display: 'flex',
                gap: 5,
                alignItems: 'center',
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#6366f1',
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input bar */}
      <div
        style={{
          width: visible ? 480 : 44,
          height: 44,
          background: 'rgba(7, 10, 18, 0.86)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: visible ? '0 12px' : '0',
          justifyContent: visible ? 'flex-start' : 'center',
          boxShadow: visible
            ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.12)'
            : '0 4px 12px rgba(0,0,0,0.3)',
          transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), padding 0.25s ease, box-shadow 0.25s ease',
          overflow: 'hidden',
          pointerEvents: 'all',
          cursor: visible ? 'default' : 'pointer',
        }}
        onClick={() => { if (!visible) { show(); setTimeout(() => inputRef.current?.focus(), 260) } }}
      >
        {/* Sparkle icon */}
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ flexShrink: 0, opacity: visible ? 1 : 0.55, transition: 'opacity 0.2s' }}
        >
          <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z" fill="#818cf8"/>
        </svg>

        {visible && (
          <>
            {imageAttachment && (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={imageAttachment.preview} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                <button
                  onClick={() => setImageAttachment(null)}
                  style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#374151', border: 'none', color: 'white', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >✕</button>
              </div>
            )}

            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={show}
              onBlur={scheduleHide}
              placeholder={loading ? 'Working…' : 'Describe a diagram, or paste an image…'}
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f3f4f6',
                fontSize: 13,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                caretColor: '#818cf8',
              }}
            />

            <button
              onClick={send}
              disabled={loading || (!input.trim() && !imageAttachment)}
              style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: loading || (!input.trim() && !imageAttachment) ? 'rgba(99,102,241,0.2)' : '#6366f1',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                <path d="M1 6h10M7 2l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
