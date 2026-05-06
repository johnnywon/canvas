import { createContext } from 'react'

export type ActiveThread = {
  parentType: 'node' | 'edge'
  parentId: string
} | null

export type CanvasContextValue = {
  canvasId: string
  preferredLang: 'en' | 'ko'
  setPreferredLang: (lang: 'en' | 'ko') => void
  openThread: (parentType: 'node' | 'edge', parentId: string) => void
  closeThread: () => void
  activeThread: ActiveThread
}

export const CanvasContext = createContext<CanvasContextValue>({
  canvasId: '',
  preferredLang: 'en',
  setPreferredLang: () => {},
  openThread: () => {},
  closeThread: () => {},
  activeThread: null,
})
