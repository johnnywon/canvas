import { createContext } from 'react'

export type ActiveThread = {
  parentType: 'node' | 'edge'
  parentId: string
} | null

export type UserRole = 'owner' | 'editor' | 'viewer'

export type CanvasContextValue = {
  canvasId: string
  userRole: UserRole
  currentUserEmail: string
  preferredLang: 'en' | 'ko'
  setPreferredLang: (lang: 'en' | 'ko') => void
  openThread: (parentType: 'node' | 'edge', parentId: string) => void
  closeThread: () => void
  activeThread: ActiveThread
  commentedIds: Set<string>
  addCommentedId: (id: string) => void
}

export const CanvasContext = createContext<CanvasContextValue>({
  canvasId: '',
  userRole: 'owner',
  currentUserEmail: '',
  preferredLang: 'en',
  setPreferredLang: () => {},
  openThread: () => {},
  closeThread: () => {},
  activeThread: null,
  commentedIds: new Set(),
  addCommentedId: () => {},
})
