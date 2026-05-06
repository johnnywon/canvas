// Shared icon primitives — one source of truth for all canvas icons

export function CommentIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9.5l-2.5 3-2.5-3H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function PencilIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M11.5 1.5a2.121 2.121 0 0 1 3 3L5 14l-4 1 1-4L11.5 1.5z" />
    </svg>
  )
}

export function TrashIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M6 2h4a1 1 0 0 0-2 0H6a1 1 0 0 0-2 0H1v1h14V2h-3a1 1 0 0 0-2 0zM2 4l1 10h10l1-10H2zm4 2h1v6H6V6zm3 0h1v6H9V6z" />
    </svg>
  )
}

export function SortGridIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="currentColor">
      <rect x="0" y="0" width="5" height="5" rx="1" />
      <rect x="7" y="0" width="5" height="5" rx="1" />
      <rect x="0" y="7" width="5" height="5" rx="1" />
      <rect x="7" y="7" width="5" height="5" rx="1" />
    </svg>
  )
}

export function LockIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M12 7V5a4 4 0 0 0-8 0v2H2v8h12V7h-2zM6 5a2 2 0 0 1 4 0v2H6V5zm3 6.7V13H7v-1.3A1.5 1.5 0 1 1 9 11.7z" />
    </svg>
  )
}

export function UnlockIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor">
      <path d="M12 7V5a4 4 0 0 0-7.9-1H2.5A6 6 0 0 1 14 5v2h-2zM2 7h12v8H2V7zm5 4.7V13h2v-1.3A1.5 1.5 0 1 0 7 11.7z" />
    </svg>
  )
}
