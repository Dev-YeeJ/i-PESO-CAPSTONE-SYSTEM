// src/layouts/GuestLayout.jsx
// Minimal shell for /, /login, /register, /verify-email

import { Outlet } from 'react-router-dom'

export default function GuestLayout() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Outlet />
    </div>
  )
}