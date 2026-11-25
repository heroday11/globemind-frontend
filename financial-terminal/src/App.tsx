import { Routes, Route, Navigate } from 'react-router-dom'
import TerminalDashboard from './pages/TerminalDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TerminalDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
