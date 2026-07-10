import { useEffect, useRef } from 'react';

const TRADING_CENTERS = [
  { id: 'ny',  city: 'New York',   tz: 'America/New_York', label: 'EST/EDT', flag: '🇺🇸', color: '#10b981' },
  { id: 'ldn', city: 'London',     tz: 'Europe/London',    label: 'GMT/BST', flag: '🇬🇧', color: '#3b82f6' },
  { id: 'fra', city: 'Frankfurt',  tz: 'Europe/Berlin',    label: 'CET/CEST',flag: '🇩🇪', color: '#f59e0b' },
  { id: 'tky', city: 'Tokyo',      tz: 'Asia/Tokyo',       label: 'JST',     flag: '🇯🇵', color: '#ef4444' },
];

function ClockFace({ center, timeRef }) {
  const svgRef = useRef(null);

  useEffect(() => {
    function tick() {
      const d = new Date(new Date().toLocaleString('en-US', { timeZone: center.tz }));
      const h = d.getHours() % 12;
      const m = d.getMinutes();
      const s = d.getSeconds();

      const hAngle = ((h + m / 60) / 12) * 2 * Math.PI - Math.PI / 2;
      const mAngle = ((m + s / 60) / 60) * 2 * Math.PI - Math.PI / 2;
      const sAngle = (s / 60) * 2 * Math.PI - Math.PI / 2;

      const svg = svgRef.current;
      if (!svg) return;

      const setHand = (id, angle, len) => {
        const el = svg.querySelector(`#hand-${center.id}-${id}`);
        if (!el) return;
        el.setAttribute('x2', String(32 + len * Math.cos(angle)));
        el.setAttribute('y2', String(32 + len * Math.sin(angle)));
      };

      setHand('h', hAngle, 16);
      setHand('m', mAngle, 22);
      setHand('s', sAngle, 24);

      if (timeRef?.current) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        const ss = String(s).padStart(2, '0');
        timeRef.current.textContent = `${hh}:${mm}:${ss}`;
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [center, timeRef]);

  const tickMarks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
    return {
      x1: 32 + 26 * Math.cos(angle),
      y1: 32 + 26 * Math.sin(angle),
      x2: 32 + 29 * Math.cos(angle),
      y2: 32 + 29 * Math.sin(angle),
    };
  });

  return (
    <svg ref={svgRef} viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#0f172a" stroke={center.color} strokeWidth="2" />
      {tickMarks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#475569" strokeWidth="1.5" />
      ))}
      <line id={`hand-${center.id}-h`} x1="32" y1="32" x2="32" y2="16"
        stroke="#f8fafc" strokeWidth="3" strokeLinecap="round" />
      <line id={`hand-${center.id}-m`} x1="32" y1="32" x2="32" y2="10"
        stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
      <line id={`hand-${center.id}-s`} x1="32" y1="32" x2="32" y2="8"
        stroke={center.color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="32" cy="32" r="2" fill={center.color} />
    </svg>
  );
}

export default function MarketClocks() {
  const timeRefs = TRADING_CENTERS.reduce((acc, c) => {
    acc[c.id] = { current: null };
    return acc;
  }, {});

  return (
    <section className="bg-slate-950 py-10 border-t border-slate-800">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-xs font-mono uppercase tracking-widest">
            Live Trading Clocks
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {TRADING_CENTERS.map((center) => (
            <div
              key={center.id}
              className="rounded-2xl p-4 flex flex-col items-center gap-2"
              style={{ background: '#1e293b', border: '1px solid #334155' }}
            >
              <ClockFace center={center} timeRef={timeRefs[center.id]} />
              <div className="text-white text-xs font-bold">
                {center.flag} {center.city}
              </div>
              <div
                ref={timeRefs[center.id]}
                className="font-mono text-xs tabular-nums"
                style={{ color: center.color }}
              >
                --:--:--
              </div>
              <div className="text-slate-500 text-[10px]">{center.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
