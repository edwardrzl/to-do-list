import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  const base = 'flex flex-col items-center gap-0.5 pt-2 pb-1 px-4 text-xs font-medium transition-colors'
  const active = 'text-indigo-500'
  const inactive = 'text-gray-400'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex justify-around items-stretch safe-area-bottom shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
      <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span>Bandeja</span>
          </>
        )}
      </NavLink>

      <NavLink to="/kanban" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="5" height="16" rx="1.2"/>
              <rect x="9.5" y="4" width="5" height="16" rx="1.2"/>
              <rect x="16" y="4" width="5" height="16" rx="1.2"/>
            </svg>
            <span>Kanban</span>
          </>
        )}
      </NavLink>

      <NavLink to="/calendario" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        {({ isActive }) => (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Calendario</span>
          </>
        )}
      </NavLink>
    </nav>
  )
}
