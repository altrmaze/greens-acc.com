import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/',          label: '🏛️ Command Center',    end: true },
  { to: '/rooms',     label: '🤝 Negotiation Rooms'           },
  { to: '/analytics', label: '🔬 Agent Analytics'             },
];

export default function AppNav() {
  return (
    <nav className="bg-slate-900 border-b border-emerald-500/20 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <span className="text-emerald-400 font-extrabold tracking-wide text-sm flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          GREENS ACC
        </span>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
