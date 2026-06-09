// src/components/form/Field.jsx
// Reusable input field component used in both seeker and employer registration

export default function Field({ 
  label, 
  name, 
  type = 'text', 
  placeholder, 
  value, 
  onChange, 
  onBlur, 
  error, 
  rightElement, 
  disabled = false,
  ...inputProps
}) {
  return (
    <div className="form-field-group">
      <label className="designed-field-label">
        <span className="field-label-dot" />
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          {...inputProps}
          className={`designed-field-input w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all focus:outline-none ${
            rightElement ? 'pr-11' : ''
          } ${
            error
              ? 'border-red-400 focus:border-red-400'
              : 'border-slate-300 focus:border-brand-navy'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <svg
            className="w-3 h-3 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}
