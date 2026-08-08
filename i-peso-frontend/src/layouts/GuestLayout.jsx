// src/layouts/GuestLayout.jsx
import { Outlet } from 'react-router-dom'
import PublicChatWidget from '@/components/chatbot/PublicChatWidget'

const GuestLayout = () => {
  return (
    <div className="guest-shell">
      <Outlet />
      {/* Mounted here rather than per-page so the assistant follows the visitor
          across landing, login, and every registration step — the last one
          matters most, since that is where people stall on requirements. */}
      <PublicChatWidget />
    </div>
  )
}

export default GuestLayout
