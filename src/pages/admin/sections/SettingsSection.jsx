export default function SettingsSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-1">Settings</h2>
        <p className="text-sm text-slate-500">System-level configuration and environment details.</p>
      </div>

      {/* Environment */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">Environment</h3>
        </div>
        <div className="divide-y divide-slate-700">
          {[
            { label: 'Stack',         value: 'React 19 · Vite 8 · Supabase · TypeScript-ready' },
            { label: 'Auth Provider', value: 'Supabase Auth (JWT + DB role via profiles table)' },
            { label: 'RBAC Model',    value: 'Server-side role from profiles.role — never client-derived' },
            { label: 'Deployment',    value: 'GitHub Pages (dist/) via pages-deploy.yml' },
            { label: 'Under Construction', value: 'Public landing page active · Admin panel live' },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-48 flex-shrink-0">{label}</span>
              <span className="text-sm text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security policy */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">Security Policy</h3>
        </div>
        <div className="divide-y divide-slate-700">
          {[
            { label: 'Admin Access',     value: '/dashboard requires admin role (server-verified)' },
            { label: 'Redirect Policy',  value: 'Unauthenticated → /login · Non-admin → / (landing)' },
            { label: 'RLS',              value: 'Row Level Security enabled on all Supabase tables' },
            { label: 'Role Source',      value: 'profiles table (Supabase DB) — not JWT claims' },
          ].map(({ label, value }) => (
            <div key={label} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-48 flex-shrink-0">{label}</span>
              <span className="text-sm text-slate-300">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
