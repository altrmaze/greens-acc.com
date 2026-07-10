import { AdminPassGate } from './AdminPassGate';
import { useAdminAuth } from '../hooks/useAdminAuth';

function DefaultLoadingFallback() {
  return (
    <div className="p-8 text-gray-400 animate-pulse font-mono text-sm">
      Synchronizing Security Clearances…
    </div>
  );
}

function DefaultUnauthorizedFallback() {
  return (
    <div className="p-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl max-w-2xl mx-auto my-12 font-sans shadow-2xl">
      <div className="flex items-center gap-3 mb-2 text-red-400 font-bold text-lg">
        <span>⚠️ ACCESS POLICY VIOLATION</span>
      </div>
      <p className="text-sm text-red-400/80">
        Your current credentials do not provide sufficient authorization parameters
        to mount this administrative module.
      </p>
    </div>
  );
}

export function AdminProtectedRoute({
  children,
  loadingFallback = <DefaultLoadingFallback />,
  unauthorizedFallback = <DefaultUnauthorizedFallback />,
}) {
  const {
    userRole,
    isLocked,
    loading,
    isAdminPassConfigured,
    verifyAdminPassword,
  } = useAdminAuth();

  if (loading) {
    return loadingFallback;
  }

  if (userRole !== 'admin') {
    return unauthorizedFallback;
  }

  if (isLocked) {
    return (
      <AdminPassGate
        configured={isAdminPassConfigured}
        verifyPassword={verifyAdminPassword}
      />
    );
  }

  return children;
}
