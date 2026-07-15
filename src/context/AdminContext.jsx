import { createContext, useContext, useState, useCallback } from 'react';

/**
 * AdminContext — shared state for the Admin Control Room.
 *
 * Centralises UI state that multiple admin sections need to share
 * (e.g. sidebar collapse, global refresh trigger, banner notices).
 * All sensitive data stays in Supabase / AuthContext; this context
 * holds presentation-layer state only.
 *
 * Provides:
 *   sidebarOpen     — boolean, mobile sidebar visibility
 *   setSidebarOpen  — setter
 *   refreshKey      — integer that sections can watch to re-fetch data
 *   triggerRefresh  — increments refreshKey (broadcast a data refresh)
 *   banner          — { type: 'success'|'error'|'info', message: string } | null
 *   showBanner      — (type, message) => void
 *   clearBanner     — () => void
 */

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [banner,      setBanner]      = useState(null);

  const triggerRefresh = useCallback(
    () => setRefreshKey((k) => k + 1),
    []
  );

  const showBanner = useCallback((type, message) => {
    setBanner({ type, message });
  }, []);

  const clearBanner = useCallback(() => setBanner(null), []);

  return (
    <AdminContext.Provider
      value={{
        sidebarOpen, setSidebarOpen,
        refreshKey,  triggerRefresh,
        banner,      showBanner, clearBanner,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

/**
 * useAdmin — consume the AdminContext.
 * Must be called within a component tree wrapped by <AdminProvider>.
 */
export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (ctx === null) {
    throw new Error('useAdmin must be used within an <AdminProvider>');
  }
  return ctx;
}
