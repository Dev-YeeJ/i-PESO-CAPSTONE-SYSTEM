// src/components/form/PasswordStrengthMeter.jsx

export default function PasswordStrengthMeter({ password, strength }) {
  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength.score ? strength.color : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className="text-xs font-medium text-slate-500">{strength.label} password</p>
    </div>
  )
}
