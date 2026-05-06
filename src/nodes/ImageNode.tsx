import { useCallback, useContext, useRef, useState } from 'react'
import { Handle, Position, useReactFlow, type NodeProps } from '@xyflow/react'
import { CanvasContext } from '../contexts/CanvasContext'

export type ImageNodeData = {
  imageUrl?: string
}

export function ImageNode({ id, data, selected }: NodeProps) {
  const { updateNodeData } = useReactFlow()
  const { openThread } = useContext(CanvasContext)
  const nodeData = data as ImageNodeData
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const json = (await res.json()) as { url: string }
        updateNodeData(id, { imageUrl: json.url })
      } finally {
        setUploading(false)
      }
    },
    [id, updateNodeData],
  )

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.stopPropagation(); setDragOver(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { uploadFile(file); break }
      }
    }
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const borderColor = selected ? '#6366f1' : dragOver ? '#6366f1' : '#374151'
  const borderStyle = nodeData.imageUrl ? 'solid' : 'dashed'

  return (
    <div
      className="nodrag"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      tabIndex={0}
      style={{
        minWidth: 200,
        maxWidth: 480,
        borderRadius: 12,
        border: `2px ${borderStyle} ${borderColor}`,
        background: '#111827',
        overflow: 'hidden',
        position: 'relative',
        outline: 'none',
        boxShadow: selected ? '0 0 0 3px rgba(99,102,241,0.2)' : 'none',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        cursor: nodeData.imageUrl ? 'default' : 'pointer',
      }}
      onClick={() => { if (!nodeData.imageUrl) fileInputRef.current?.click() }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="target" position={Position.Top} id="top-target" />

      {nodeData.imageUrl ? (
        <>
          <img
            src={nodeData.imageUrl}
            alt=""
            style={{ display: 'block', maxWidth: '100%', maxHeight: 400 }}
            draggable={false}
          />
          <button
            className="nodrag nopan"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              color: '#9ca3af',
              fontSize: 11,
              padding: '3px 8px',
              cursor: 'pointer',
              opacity: selected ? 1 : 0,
              transition: 'opacity 0.15s ease',
            }}
          >
            Replace
          </button>
          {/* Comment button */}
          <button
            className="nodrag nopan"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); openThread('node', id) }}
            title="Comments"
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: '#6b7280',
              cursor: 'pointer',
              padding: '3px 5px',
              display: 'flex',
              alignItems: 'center',
              opacity: selected ? 1 : 0,
              transition: 'opacity 0.15s ease, color 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6366f1')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#6b7280')}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 1H2C1.45 1 1 1.45 1 2v9c0 .55.45 1 1 1h3v3l3-3h6c.55 0 1-.45 1-1V2c0-.55-.45-1-1-1z" />
            </svg>
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10, padding: 24 }}>
          {uploading ? (
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={dragOver ? '#6366f1' : '#4b5563'} strokeWidth="1.5" style={{ transition: 'stroke 0.15s ease' }}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: dragOver ? '#818cf8' : '#6b7280', marginBottom: 2, transition: 'color 0.15s ease' }}>
                  {dragOver ? 'Drop to upload' : 'Drop, paste, or click'}
                </p>
                <p style={{ fontSize: 11, color: '#4b5563' }}>PNG, JPG, GIF, WebP</p>
              </div>
            </>
          )}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="nodrag nopan" style={{ display: 'none' }} onChange={handleFileChange} />

      <Handle type="source" position={Position.Right} />
      <Handle type="source" position={Position.Bottom} id="bottom-source" />
    </div>
  )
}
