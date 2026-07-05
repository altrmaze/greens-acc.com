import React, { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/analytics/dashboard')
      .then((res) => res.json())
      .then((data) => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDashboardOpen((prev) => !prev)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #334155',
          borderRadius: '9999px',
          padding: '12px 18px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(2, 6, 23, 0.45)',
        }}
      >
        Admin Console
      </button>
      {isDashboardOpen && (
        <section
          style={{
            background: '#0f172a',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            overflowY: 'auto',
            zIndex: 10000,
            padding: '24px',
            color: '#f8fafc',
          }}
        >
          <button
            type="button"
            onClick={() => setIsDashboardOpen(false)}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 14px',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            X Close
          </button>
          {loading && <div>Loading dashboard...</div>}
          {!loading && !metrics && <div>Unable to load dashboard metrics.</div>}
          {!loading && metrics && (
            <section>
              <h2>Greens ACC Admin Dashboard</h2>
              <pre>{JSON.stringify(metrics, null, 2)}</pre>
            </section>
          )}
        </section>
      )}
    </>
  );
}
