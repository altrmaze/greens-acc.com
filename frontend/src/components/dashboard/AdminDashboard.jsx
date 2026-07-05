import React, { useEffect, useState } from 'react';

export default function AdminDashboard() {
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

  if (loading) return <div>Loading dashboard...</div>;
  if (!metrics) return <div>Unable to load dashboard metrics.</div>;

  return (
    <section>
      <h2>Greens ACC Admin Dashboard</h2>
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </section>
  );
}
