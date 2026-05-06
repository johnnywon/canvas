import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CanvasList } from './pages/CanvasList'
import { CanvasEditor } from './pages/CanvasEditor'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/canvases" replace />} />
        <Route path="/canvases" element={<CanvasList />} />
        <Route path="/canvases/:id" element={<CanvasEditor />} />
      </Routes>
    </BrowserRouter>
  )
}
