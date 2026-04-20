// src/pages/landing/LandingPage.jsx
import { Link } from 'react-router-dom'
import LandingNavbar from '@/components/landing/LandingNavbar'

function StatCard({ number, label }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--color-accent)', fontWeight: 400 }}>
        {number}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <LandingNavbar />

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(160deg, #0f2d56 0%, #1a4b8c 55%, #1e5ba8 100%)',
        flex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(245,158,11,0.05)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(245,158,11,0.12)',
          border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 'var(--radius-full)',
          padding: '5px 14px', marginBottom: 24,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
          <span style={{ color: 'var(--color-accent-light)', fontSize: 12, fontWeight: 600, letterSpacing: '0.04em' }}>
            PESO DIGITAL SERVICES
          </span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 6vw, 62px)',
          color: '#fff',
          textAlign: 'center',
          lineHeight: 1.1,
          maxWidth: 700,
          marginBottom: 20,
        }}>
          Your Gateway to <em>Employment</em> Opportunities
        </h1>

        <p style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 'clamp(15px, 2vw, 18px)',
          textAlign: 'center',
          maxWidth: 520,
          marginBottom: 60,
          lineHeight: 1.7,
        }}>
          The Public Employment Service Office connects job seekers with employers across the region — faster, simpler, and fully digital.
        </p>

        {/* Dual CTA Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, maxWidth: 680, width: '100%',
        }}>
          {/* Seeker card */}
          <Link to="/register?role=seeker" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px 28px',
              cursor: 'pointer', transition: 'all 0.2s',
              backdropFilter: 'blur(4px)',
            }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 16,
                background: 'rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>👤</div>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                I'm a Job Seeker
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Browse thousands of job listings, submit applications, and track your employment journey.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'var(--color-accent-light)', fontSize: 14, fontWeight: 600,
              }}>
                Register as Seeker <span>→</span>
              </div>
            </div>
          </Link>

          {/* Employer card */}
          <Link to="/register?role=employer" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px 28px',
              cursor: 'pointer', transition: 'all 0.2s',
              backdropFilter: 'blur(4px)',
            }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.10)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, marginBottom: 16,
                background: 'rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
              }}>🏢</div>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                I'm an Employer
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Post job vacancies, review applicants, and find the right talent for your company.
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: '#6ee7b7', fontSize: 14, fontWeight: 600,
              }}>
                Register as Employer <span>→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: 48, marginTop: 64,
          padding: '24px 48px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--radius-xl)',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <StatCard number="12,400+" label="Job Seekers Registered" />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <StatCard number="850+"   label="Active Employers" />
          <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
          <StatCard number="3,200+" label="Jobs Placed This Year" />
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        background: '#070f1c',
        padding: '20px 24px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
      }}>
        © {new Date().getFullYear()} i-PESO — Public Employment Service Office Digital Platform
      </footer>
    </div>
  )
}