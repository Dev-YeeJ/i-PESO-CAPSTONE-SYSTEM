import { createElement } from 'react'
import { NavLink } from 'react-router-dom'

export default function MobileBottomNav({ links }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
      aria-label="Primary mobile navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {links.slice(0, 5).map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to.endsWith('dashboard')}
            className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-black leading-tight transition ${
              isActive
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {createElement(icon, { className: 'h-5 w-5' })}
            <span className="line-clamp-1 max-w-full">{mobileLabel(label)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function mobileLabel(label) {
  if (label === 'My Applications') return 'Applications'
  if (label === 'Government Programs') return 'Programs'
  return label.replace('AI ', '')
}
