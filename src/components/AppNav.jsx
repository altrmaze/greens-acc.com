import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import { useAuth } from '../hooks/useAuth';

/** Pages visible to developer + admin roles in the main nav. */
const DEV_NAV = [
  { to: '/dev-dashboard',   icon: '🖥️',  key: 'devDashboard'  },
  { to: '/command-center',  icon: '🌐',  key: 'commandCenter'  },
  { to: '/rooms',           icon: '🤝',  key: 'rooms'          },
  { to: '/analytics',       icon: '🔬',  key: 'analytics'      },
  { to: '/security',        icon: '🛡️', key: 'security'        },
  { to: '/monitor',         icon: '📡',  key: 'aegis'          },
  { to: '/container',       icon: '🔐',  key: 'container'      },
  { to: '/documents',       icon: '📄',  key: 'documents'      },
  { to: '/automations',     icon: '⚙️', key: 'automations'    },
  { to: '/voice',           icon: '🎙️', key: 'voice'          },
  { to: '/travel',          icon: '✈️', key: 'travel'          },
  { to: '/forms',           icon: '📝',  key: 'forms'          },
  { to: '/bills',           icon: '💳',  key: 'bills'          },
  { to: '/household',       icon: '🏠',  key: 'household'      },
  { to: '/permissions',     icon: '🔑',  key: 'permissions'    },
  { to: '/activity',        icon: '📋',  key: 'activity'       },
  { to: '/settings',        icon: '🔧',  key: 'settings'       },
];

function NavItem({ to, icon, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isActive
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`
      }
    >
      <span>{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function AppNav() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentLang = i18n.language;

  const toggleLang = () => {
    i18n.changeLanguage(currentLang === 'ar' ? 'en' : 'ar');
  };

  const close = () => setMenuOpen(false);

  return (
    <nav className="bg-slate-900 border-b border-emerald-500/20 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <span className="text-emerald-400 font-extrabold tracking-wide text-sm flex items-center gap-2 flex-shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          GREENS ACC
        </span>

        {/* Desktop nav — first few links visible, rest accessible via scroll */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-2xl">
          {DEV_NAV.slice(0, 6).map(({ to, icon, key, end }) => (
            <NavItem key={to} to={to} icon={icon} label={t(`nav.${key}`)} end={end} />
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Lang toggle */}
          <button
            onClick={toggleLang}
            className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded-lg transition-colors"
          >
            {currentLang === 'ar' ? 'EN' : 'AR'}
          </button>

          {/* Sign out (desktop) */}
          {user && (
            <button
              onClick={signOut}
              className="hidden lg:block text-xs text-slate-400 hover:text-red-400 px-2 py-1 rounded-lg transition-colors"
            >{t('nav.logout')}</button>
          )}

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown — full nav */}
      {menuOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-slate-800 px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-3">Navigation</p>
          {DEV_NAV.map(({ to, icon, key, end }) => (
            <NavItem key={to} to={to} icon={icon} label={t(`nav.${key}`)} end={end} onClick={close} />
          ))}
          {user && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => { signOut(); close(); }}
                className="w-full text-start px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >{t('nav.logout')}</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

