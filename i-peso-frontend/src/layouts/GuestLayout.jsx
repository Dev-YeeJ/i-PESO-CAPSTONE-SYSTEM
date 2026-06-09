// src/layouts/GuestLayout.jsx
import { Outlet } from 'react-router-dom'

const GuestLayout = () => {
  return <div className="guest-shell"><Outlet /></div>
}

export default GuestLayout
