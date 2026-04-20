// src/components/common/AppInput.jsx
 
export default function AppInput({
  label,
  id,
  error,
  hint,
  type = 'text',
  required = false,
  style = {},
  containerStyle = {},
  ...props
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...containerStyle }}>
      {label && (
        <label htmlFor={id} style={{
          fontSize: 14, fontWeight: 500, color: 'var(--color-text)',
        }}>
          {label}
          {required && <span style={{ color: 'var(--color-error)', marginLeft: 2 }}>*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: 15,
          fontFamily: 'var(--font-body)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-md)',
          background: error ? 'var(--color-error-bg)' : 'var(--color-surface)',
          color: 'var(--color-text)',
          outline: 'none',
          transition: 'border-color var(--transition), box-shadow var(--transition)',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--color-primary)'
          e.target.style.boxShadow = error
            ? '0 0 0 3px rgba(220,38,38,0.12)'
            : '0 0 0 3px rgba(26,75,140,0.12)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--color-error)' : 'var(--color-border)'
          e.target.style.boxShadow = 'none'
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: 13, color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: 4 }}>
          ⚠ {error}
        </span>
      )}
      {hint && !error && (
        <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{hint}</span>
      )}
    </div>
  )
}