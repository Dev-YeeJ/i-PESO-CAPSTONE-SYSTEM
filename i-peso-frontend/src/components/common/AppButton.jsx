// src/components/common/AppButton.jsx
// Variants: primary | secondary | ghost | danger

export default function AppButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  style = {},
  ...props
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, border: 'none', borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
    transition: 'all var(--transition)', textDecoration: 'none',
    outline: 'none', position: 'relative', overflow: 'hidden',
    opacity: disabled || loading ? 0.65 : 1,
    pointerEvents: disabled || loading ? 'none' : 'auto',
  }

  const sizes = {
    sm: { padding: '8px 16px', fontSize: 13 },
    md: { padding: '11px 22px', fontSize: 15 },
    lg: { padding: '14px 28px', fontSize: 16 },
  }

  const variants = {
    primary: {
      background: 'var(--color-primary)',
      color: '#fff',
    },
    secondary: {
      background: 'var(--color-primary-50)',
      color: 'var(--color-primary)',
      border: '1px solid var(--color-primary-100)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--color-text-2)',
      border: '1px solid var(--color-border)',
    },
    danger: {
      background: 'var(--color-error)',
      color: '#fff',
    },
    accent: {
      background: 'var(--color-accent)',
      color: '#fff',
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseOver={e => { if (!disabled && !loading) e.currentTarget.style.filter = 'brightness(0.92)' }}
      onMouseOut={e => { e.currentTarget.style.filter = 'none' }}
      onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,75,140,0.2)' }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span style={{
          width: 16, height: 16, borderRadius: '50%',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }} />
      )}
      {children}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  )
}