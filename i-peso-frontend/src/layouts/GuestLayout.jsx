// src/layouts/GuestLayout.jsx
import { Outlet } from 'react-router-dom'

const GuestLayout = () => {
  return (
    <div className="guest-shell">
      <Outlet />
      {/* The chatbot was moved to App.jsx to persist globally */}
    </div>
  )
}

export default GuestLayout
