import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CanvasContext } from '../contexts/CanvasContext'

type Comment = {
  id: string
  original_text: string
  original_lang: 'en' | 'ko'
  en_text: string | null
  ko_text: string | null
  author_email: string
  created_at: string
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function CommentPanel() {
  const { canvasId, preferredLang, activeThread, closeThread, addCommentedId, deleteNode } = useContext(CanvasContext)
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchComments = useCallback(() => {
    if (!activeThread) return
    fetch(
      `/api/canvases/${canvasId}/comments?parent_type=${activeThread.parentType}&parent_id=${activeThread.parentId}`
    )
      .then((r) => r.json())
      .then((data) => setComments(data as Comment[]))
      .catch(() => {})
  }, [canvasId, activeThread])

  useEffect(() => {
    setComments([])
    setText('')
    fetchComments()
    const interval = setInterval(fetchComments, 10000)
    return () => clearInterval(interval)
  }, [fetchComments])

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments.length])

  const submit = async () => {
    if (!text.trim() || !activeThread || submitting) return
    setSubmitting(true)
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_id: canvasId,
          parent_type: activeThread.parentType,
          parent_id: activeThread.parentId,
          text: text.trim(),
        }),
      })
      setText('')
      if (activeThread) addCommentedId(activeThread.parentId)
      fetchComments()
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  if (!activeThread) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 320,
        height: '100%',
        background: '#0d1117',
        borderLeft: '1px solid #1f2937',
        zIndex: 20,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 48,
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 8,
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="#6366f1">
          <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h3v3l3-3h6c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z" />
        </svg>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#f9fafb' }}>
          Comments
        </span>
        <button
          onClick={closeThread}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: '2px 4px',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
        >
          ✕
        </button>
      </div>

      {/* Comments list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {comments.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>No comments yet.</p>
            <p style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>Write in English or Korean.</p>
          </div>
        ) : (
          comments.map((c) => (
            <CommentBubble key={c.id} comment={c} preferredLang={preferredLang} />
          ))
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a comment"
          rows={3}
          style={{
            width: '100%',
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: 8,
            color: '#f9fafb',
            fontSize: 12,
            lineHeight: 1.5,
            padding: '8px 10px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = '#6366f1')}
          onBlur={(e) => ((e.currentTarget as HTMLTextAreaElement).style.borderColor = '#374151')}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          <span style={{ fontSize: 10, color: '#374151' }}>⌘/Ctrl+Enter to send</span>
          <button
            onClick={submit}
            disabled={!text.trim() || submitting}
            style={{
              background: '#6366f1',
              border: 'none',
              borderRadius: 6,
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              padding: '5px 14px',
              cursor: !text.trim() || submitting ? 'default' : 'pointer',
              opacity: !text.trim() || submitting ? 0.45 : 1,
              transition: 'opacity 0.1s ease',
            }}
          >
            {submitting ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>

      {/* Sticky delete section */}
      {activeThread?.nodeType === 'sticky_comment' && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #1f2937', flexShrink: 0 }}>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                width: '100%', background: 'none', border: '1px solid #374151',
                borderRadius: 8, color: '#6b7280', fontSize: 12, cursor: 'pointer',
                padding: '6px', fontFamily: 'inherit', transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#374151'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280' }}
            >
              Delete sticky note
            </button>
          ) : (
            <div>
              <p style={{ fontSize: 11, color: '#f87171', margin: '0 0 8px', textAlign: 'center' }}>
                Delete this sticky and all its comments?
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ flex: 1, background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#e5e7eb', fontSize: 12, cursor: 'pointer', padding: '6px', fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { deleteNode(activeThread.parentId); setConfirmDelete(false) }}
                  style={{ flex: 1, background: '#7f1d1d', border: 'none', borderRadius: 8, color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '6px', fontFamily: 'inherit' }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CommentBubble({
  comment,
  preferredLang,
}: {
  comment: Comment
  preferredLang: 'en' | 'ko'
}) {
  const [showOriginal, setShowOriginal] = useState(false)

  const primaryText = showOriginal
    ? comment.original_text
    : preferredLang === 'en'
      ? (comment.en_text ?? comment.original_text)
      : (comment.ko_text ?? comment.original_text)

  // Only show toggle if a translation exists AND this comment wasn't originally in preferred lang
  const canToggle =
    !showOriginal &&
    comment.original_lang !== preferredLang &&
    (comment.en_text !== null || comment.ko_text !== null)

  const authorHandle = comment.author_email.split('@')[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#818cf8' }}>{authorHandle}</span>
        <span style={{ fontSize: 10, color: '#374151' }}>{formatTime(comment.created_at)}</span>
      </div>
      <p
        style={{
          fontSize: 12,
          color: '#e5e7eb',
          lineHeight: 1.55,
          margin: 0,
          wordBreak: 'break-word',
        }}
      >
        {primaryText}
      </p>
      {(canToggle || showOriginal) && (
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          style={{
            background: 'none',
            border: 'none',
            color: '#4b5563',
            fontSize: 10,
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            textDecoration: 'underline',
            fontFamily: 'inherit',
          }}
        >
          {showOriginal ? `Show ${preferredLang === 'en' ? 'English' : 'Korean'}` : 'Show original'}
        </button>
      )}
    </div>
  )
}
