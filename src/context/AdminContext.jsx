import { createContext, useContext, useState, useCallback } from 'react';

/**
 * AdminContext — shared state for the Admin Control Room.
 *
 * Provides:
 *   refreshKey    — counter that increments to trigger data refetches across sections
 *   triggerRefresh — function that increments refreshKey
 *   notification  — { type: 'success'|'error'|'info', message: string } | null
 *   setNotification — function to set a transient notification
 *   clearNotification — function to clear the notification
 */
const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [notification,  setNotificationState] = useState(null);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const setNotification = useCallback((type, message) => {
    setNotificationState({ type, message });
  }, []);

  const clearNotification = useCallback(() => {
    setNotificationState(null);
  }, []);

  return (
    <AdminContext.Provider
      value={{ refreshKey, triggerRefresh, notification, setNotification, clearNotification }}
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
