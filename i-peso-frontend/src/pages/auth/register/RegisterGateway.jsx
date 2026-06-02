// src/pages/auth/register/RegisterGateway.jsx
import { useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

const ROLES = [
  {
    route    : '/register/seeker',
    role     : 'seeker',
    icon     : '👤',
    title    : "I'm looking for work",
    subtitle : 'Job Seeker',
    desc     : 'Register as a job seeker, complete your NSRP profile, and get matched with local opportunities.',
    cta      : 'Register as Job Seeker',
    accent   : '#15803d',
    bg       : '#f0fdf4',
    border   : '#bbf7d0',
  },
  {
    route    : '/register/employer',
    role     : 'employer',
    icon     : '🏢',
    title    : "I want to hire talent",
    subtitle : 'Employer',
    desc     : 'Post vacancies, manage applicants, and connect with qualified job seekers in Urdaneta City.',
    cta      : 'Register as Employer',
    accent   : '#1d4ed8',
    bg       : '#eff6ff',
    border   : '#bfdbfe',
  },
]

export default function RegisterGateway() {
  const navigate = useNavigate()
  const location = useLocation()

  // If navigated with a pre-selected role (from LandingPage CTAs), auto-redirect
  useEffect(() => {
    const preselected = location.state?.preselectedRole
    if (preselected === 'seeker')   navigate('/register/seeker',   { replace: true })
    if (preselected === 'employer') navigate('/register/employer', { replace: true })
  }, [location.state, navigate])

  return (
    <div style={s.page}>

      <div style={s.bgCircle1} />
      <div style={s.bgCircle2} />

      <div style={s.container}>

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoBox}>
            <span style={s.logoI}>i</span>
            <span style={s.logoDash}>-</span>
            <span style={s.logoPeso}>PESO</span>
          </div>
          <span style={s.logoSub}>URDANETA CITY</span>
        </div>

        <h1 style={s.title}>How will you use i-PESO?</h1>
        <p style={s.subtitle}>
          Choose your role to get started. You can only have one account type per email address.
        </p>

        {/* Role Cards */}
        <div style={s.cardsRow}>
          {ROLES.map((r) => (
            <div
              key={r.role}
              style={{
                ...s.card,
                borderTop: `4px solid ${r.accent}`,
                backgroundColor: r.bg,
                borderColor: r.border,
              }}
              onClick={() => navigate(r.route)}
            >
              <div style={s.cardIcon}>{r.icon}</div>
              <p style={{ ...s.cardSubtitle, color: r.accent }}>{r.subtitle}</p>
              <h2 style={s.cardTitle}>{r.title}</h2>
              <p style={s.cardDesc}>{r.desc}</p>
              <button
                style={{ ...s.cardBtn, backgroundColor: r.accent }}
                onClick={(e) => { e.stopPropagation(); navigate(r.route) }}
              >
                {r.cta} →
              </button>
            </div>
          ))}
        </div>

        {/* Government Note */}
        <div style={s.noteBox}>
          <span style={s.noteIcon}>ℹ️</span>
          <p style={s.noteText}>
            This is the official digital registration portal of the{' '}
            <strong>Urdaneta City Public Employment Service Office (PESO)</strong>,
            aligned with the DOLE National Skills Registration Program (NSRP).
          </p>
        </div>

        <p style={s.loginRow}>
          Already have an account?{' '}
          <Link to="/login" style={s.loginLink}>Sign in here</Link>
        </p>

      </div>
    </div>
  )
}

const s = {
  page        : { minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' },
  bgCircle1   : { position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', backgroundColor: '#dbeafe', borderRadius: '50%', opacity: 0.4 },
  bgCircle2   : { position: 'absolute', bottom: '-80px', left: '-80px', width: '280px', height: '280px', backgroundColor: '#dcfce7', borderRadius: '50%', opacity: 0.4 },
  container   : { width: '100%', maxWidth: '760px', position: 'relative', zIndex: 1 },
  logoWrap    : { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' },
  logoBox     : { display: 'flex', alignItems: 'center', backgroundColor: '#1d4ed8', borderRadius: '16px', padding: '10px 20px', marginBottom: '6px' },
  logoI       : { color: '#93c5fd', fontSize: '22px', fontWeight: '700' },
  logoDash    : { color: '#60a5fa', fontSize: '22px', margin: '0 1px' },
  logoPeso    : { color: '#ffffff', fontSize: '22px', fontWeight: '700', letterSpacing: '1px' },
  logoSub     : { fontSize: '10px', color: '#94a3b8', letterSpacing: '3px', fontWeight: '600' },
  title       : { fontSize: '28px', fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: '8px' },
  subtitle    : { fontSize: '15px', color: '#64748b', textAlign: 'center', marginBottom: '32px', lineHeight: '1.6' },
  cardsRow    : { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' },
  card        : { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '28px', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' },
  cardIcon    : { fontSize: '36px', marginBottom: '12px' },
  cardSubtitle: { fontSize: '11px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' },
  cardTitle   : { fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' },
  cardDesc    : { fontSize: '13px', color: '#64748b', lineHeight: '1.6', marginBottom: '20px' },
  cardBtn     : { color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 20px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', width: '100%' },
  noteBox     : { display: 'flex', alignItems: 'flex-start', gap: '10px', backgroundColor: '#fefce8', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px', marginBottom: '20px' },
  noteIcon    : { fontSize: '16px', flexShrink: 0 },
  noteText    : { fontSize: '12px', color: '#92400e', lineHeight: '1.6' },
  loginRow    : { textAlign: 'center', fontSize: '14px', color: '#64748b' },
  loginLink   : { color: '#2563eb', fontWeight: '700', textDecoration: 'none' },
}