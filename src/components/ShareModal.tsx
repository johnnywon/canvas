import { useEffect, useRef, useState } from 'react'

type Member = {
  user_email: string
  role: 'editor' | 'viewer'
}

type Props = {
  canvasId: string
  canvasName: string
  ownerEmail: string
  onClose: () => void
}

export function ShareModal({ canvasId, canvasName, ownerEmail, onClose }: Props) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'editor' | 'viewer'>('editor')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/canvases/${canvasId}/members`)
      .then((r) => r.json())
      .then((data) => { setMembers(data as Member[]); setLoading(false) })
  }, [canvasId])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleRoleChange = async (memberEmail: string, role: 'editor' | 'viewer') => {
    setMembers((ms) => ms.map((m) => m.user_email === memberEmail ? { ...m, role } : m))
    await fetch(`/api/canvases/${canvasId}/members/${encodeURIComponent(memberEmail)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
  }

  const handleRemove = async (memberEmail: string) => {
    setMembers((ms) => ms.filter((m) => m.user_email !== memberEmail))
    await fetch(`/api/canvases/${canvasId}/members/${encodeURIComponent(memberEmail)}`, {
      method: 'DELETE',
    })
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = newEmail.trim()
    if (!email) return
    if (email === ownerEmail) { setAddError("That's the canvas owner."); return }
    if (members.some((m) => m.user_email === email)) { setAddError('Already a member.'); return }
    setAdding(true)
    setAddError('')
    try {
      const res = await fetch(`/api/canvases/${canvasId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: newRole }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        setAddError(body.error ?? 'Failed to add.')
        return
      }
      setMembers((ms) => [...ms, { user_email: email, role: newRole }])
      setNewEmail('')
    } finally {
      setAdding(false)
    }
  }

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Card */}
      <div
        style={{
          background: '#0d1117',
          border: '1px solid #1f2937',
          borderRadius: 16,
          width: 480,
          maxWidth: '90vw',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0, marginBottom: 2 }}>Sharing</p>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f9fafb' }}>{canvasName}</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px 6px', borderRadius: 6 }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#e5e7eb')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {/* Owner row */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Owner</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Avatar email={ownerEmail} />
            <span style={{ flex: 1, fontSize: 13, color: '#e5e7eb' }}>{ownerEmail}</span>
            <span style={{ fontSize: 11, color: '#6b7280', background: '#1f2937', padding: '2px 10px', borderRadius: 999 }}>Owner</span>
          </div>

          {/* Members */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>
            People with access
          </p>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : members.length === 0 ? (
            <p style={{ fontSize: 12, color: '#4b5563', margin: '0 0 20px' }}>No teammates added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
              {members.map((m) => (
                <div key={m.user_email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: '#111827' }}>
                  <Avatar email={m.user_email} />
                  <span style={{ flex: 1, fontSize: 13, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.user_email}
                  </span>
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.user_email, e.target.value as 'editor' | 'viewer')}
                    style={{
                      background: '#1f2937', border: '1px solid #374151', borderRadius: 6,
                      color: '#e5e7eb', fontSize: 11, padding: '3px 6px', cursor: 'pointer',
                    }}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => handleRemove(m.user_email)}
                    title="Remove"
                    style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4, lineHeight: 1 }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#4b5563')}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add member */}
          <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 10px' }}>Add teammate</p>
          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6 }}>
            <input
              ref={inputRef}
              type="email"
              value={newEmail}
              onChange={(e) => { setNewEmail(e.target.value); setAddError('') }}
              placeholder="colleague@pulsead.io"
              style={{
                flex: 1, background: '#111827', border: '1px solid #374151', borderRadius: 8,
                color: '#f9fafb', fontSize: 12, padding: '8px 10px', outline: 'none', fontFamily: 'inherit',
              }}
              onFocus={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = '#6366f1')}
              onBlur={(e) => ((e.currentTarget as HTMLInputElement).style.borderColor = '#374151')}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'editor' | 'viewer')}
              style={{
                background: '#111827', border: '1px solid #374151', borderRadius: 8,
                color: '#e5e7eb', fontSize: 12, padding: '8px 8px', cursor: 'pointer',
              }}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={!newEmail.trim() || adding}
              style={{
                background: '#6366f1', border: 'none', borderRadius: 8,
                color: 'white', fontSize: 12, fontWeight: 600, padding: '8px 14px',
                cursor: !newEmail.trim() || adding ? 'default' : 'pointer',
                opacity: !newEmail.trim() || adding ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {adding ? '…' : 'Add'}
            </button>
          </form>
          {addError && <p style={{ fontSize: 11, color: '#ef4444', margin: '6px 0 0' }}>{addError}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #1f2937' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#374151' }}>
            Only people with a @pulsead.io Google account can sign in via Cloudflare Access.
          </p>
        </div>
      </div>
    </div>
  )
}

function Avatar({ email }: { email: string }) {
  const initials = email.slice(0, 2).toUpperCase()
  const hue = email.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: `hsl(${hue},55%,35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}
