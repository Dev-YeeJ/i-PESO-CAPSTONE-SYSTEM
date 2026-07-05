// src/components/landing/LandingNavbar.jsx
import { Link } from 'react-router-dom'
import AppButton from '@/components/common/AppButton'
import IPesoLogo from '@/components/branding/IPesoLogo'

export default function LandingNavbar() {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(15, 45, 86, 0.97)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 24px',
        display: 'flex', alignItems: 'center',
        height: 64,
      }}>
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: '#fff', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, color: '#fff', fontSize: 15,
          }}><IPesoLogo className="h-full w-full" /></div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>i-PESO</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, lineHeight: 1, marginTop: 2 }}>
              PUBLIC EMPLOYMENT SERVICE OFFICE
            </div>
          </div>
        </Link>

        <span style={{ flex: 1 }} />

        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/login" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500, padding: '8px 14px', borderRadius: 8, textDecoration: 'none' }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
          >Log in</Link>
          <AppButton
            variant="accent"
            size="sm"
            onClick={() => window.location.href = '/register'}
          >
            Register
          </AppButton>
        </nav>
      </div>
    </header>
  )
}
