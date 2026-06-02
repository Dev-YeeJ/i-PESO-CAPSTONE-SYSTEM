import { useNavigate } from 'react-router-dom'
import { useAdminAuthStore } from '@/stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAdminAuthStore((s) => s.setAuth)

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Placeholder - would call auth API in real app
    // For now, set mock admin user
    setAuth(
      { id: 1, name: 'Admin', email: 'admin@ipeso.gov.ph', role: 'admin' },
      'mock-token-' + Date.now()
    )
    navigate('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f9fb' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' }}>
          i-PESO Admin
        </h1>
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" style={{ width: '100%', padding: '10px', marginBottom: '12px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
          <input type="password" placeholder="Password" style={{ width: '100%', padding: '10px', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
          <button type="submit" style={{ width: '100%', padding: '10px', background: '#1d4ed8', color: '#fff', fontWeight: '700', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
