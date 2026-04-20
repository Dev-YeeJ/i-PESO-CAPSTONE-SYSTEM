// src/components/common/AppAlert.jsx

const VARIANTS = {
  success: { bg: 'var(--color-success-bg)', border: 'var(--color-success)', color: '#15803d', icon: '✓' },
  error:   { bg: 'var(--color-error-bg)',   border: 'var(--color-error)',   color: '#b91c1c', icon: '✕' },
  warning: { bg: 'var(--color-warning-bg)', border: 'var(--color-warning)', color: '#b45309', icon: '!' },
  info:    { bg: 'var(--color-info-bg)',    border: 'var(--color-info)',    color: '#0c4a6e', icon: 'i' },
}

export default function AppAlert({ variant = 'info', children, onDismiss }) {
  const v = VARIANTS[variant]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '12px 14px', borderRadius: 'var(--radius-md)',
      background: v.bg, border: `1px solid ${v.border}`,
      color: v.color, fontSize: 14, lineHeight: 1.5,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: v.border, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, marginTop: 1,
      }}>{v.icon}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: v.color, fontSize: 16, padding: 0, lineHeight: 1 }}
        >×</button>
      )}
    </div>
  )
}