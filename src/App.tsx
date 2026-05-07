import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CanvasList } from './pages/CanvasList'
import { CanvasEditor } from './pages/CanvasEditor'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/canvases" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<CanvasList />} />
        <Route path="/canvas/:id" element={<CanvasEditor />} />
      </Routes>
    </BrowserRouter>
  )
}
