import { useState, useEffect, useRef } from 'react';

// Strict exclusion: no fuel or diesel commodities
const MARKET_TICKERS = [
  { sym: 'S&P 500',    val: 5432.10,  chg: +0.42, type: 'index' },
  { sym: 'FTSE 100',   val: 8291.40,  chg: -0.18, type: 'index' },
  { sym: 'DAX 40',     val: 18847.30, chg: +0.61, type: 'index' },
  { sym: 'Nikkei 225', val: 38754.00, chg: +1.02, type: 'index' },
  { sym: 'BTC/USD',    val: 67420.00, chg: +2.31, type: 'crypto' },
  { sym: 'ETH/USD',    val: 3581.50,  chg: +1.87, type: 'crypto' },
  { sym: 'XAU/USD',    val: 2341.80,  chg: -0.09, type: 'commodity' },
  { sym: 'EUR/USD',    val: 1.0842,   chg: +0.11, type: 'forex' },
  { sym: 'USD/JPY',    val: 157.23,   chg: -0.24, type: 'forex' },
];

const TRADE_HEADLINES = [
  { title: 'Red Sea shipping diversions add 14 days to Asia–Europe transit times', src: "Lloyd's List", time: '2h ago', tag: 'Maritime' },
  { title: 'ASEAN free-trade bloc finalises new rules of origin for electronics exports', src: 'Trade Finance Global', time: '4h ago', tag: 'Trade Policy' },
  { title: 'Container spot rates from Shanghai to Rotterdam rise 8% week-on-week', src: 'Freightos Baltic Index', time: '5h ago', tag: 'Freight' },
  { title: 'India tightens steel import duties following WTO safeguard review', src: 'Metal Bulletin', time: '6h ago', tag: 'Commodities' },
  { title: 'Port of Rotterdam reports record TEU throughput for Q2', src: 'Port of Rotterdam', time: '8h ago', tag: 'Logistics' },
  { title: 'WTO: Global merchandise trade volumes forecast to grow 2.7% in 2025', src: 'WTO News', time: '10h ago', tag: 'Macro' },
  { title: 'Lithium carbonate prices rebound as EV battery demand accelerates', src: 'Benchmark Mineral', time: '11h ago', tag: 'Supply Chain' },
  { title: 'IMF raises emerging-market trade outlook amid currency stabilisation', src: 'IMF Bulletin', time: '12h ago', tag: 'Finance' },
];

function drift(tickers) {
  return tickers.map((t) => {
    const delta = (Math.random() - 0.49) * 0.3;
    return {
      ...t,
      val: +(t.val * (1 + delta / 100)).toFixed(t.val > 1000 ? 2 : t.val > 100 ? 3 : 4),
      chg: +(t.chg + (Math.random() - 0.5) * 0.05).toFixed(2),
    };
  });
}

function TickerCard({ ticker }) {
  const positive = ticker.chg >= 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">{ticker.sym}</div>
      <div className="text-base font-bold text-slate-900 tabular-nums">{ticker.val.toLocaleString('en-US')}</div>
      <div className={`text-xs font-semibold ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
        {positive ? '▲ +' : '▼ '}{ticker.chg}%
      </div>
    </div>
  );
}

function TradeCard({ item }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow">
      <span className="inline-block rounded bg-emerald-50 border border-emerald-200 text-emerald-700
        text-[10px] font-bold px-2 py-0.5 mb-2 uppercase tracking-wide">
        {item.tag}
      </span>
      <p className="text-sm font-semibold text-slate-800 leading-snug mb-2">{item.title}</p>
      <div className="text-[11px] text-slate-400 flex gap-2">
        <span>{item.src}</span>
        <span>· {item.time}</span>
      </div>
    </div>
  );
}

export default function MarketFeeds() {
  const [activeTab, setActiveTab] = useState('trade');
  const [tickers, setTickers] = useState(MARKET_TICKERS);

  useEffect(() => {
    const id = setInterval(() => setTickers((t) => drift(t)), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="bg-white py-10 border-t border-slate-100">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Market Intelligence</h2>
        <p className="text-sm text-slate-500 mb-5">Real-time trade news and financial market data</p>

        <div className="flex gap-1 border-b border-slate-100 mb-5">
          {[
            { id: 'trade', label: 'Trade News' },
            { id: 'markets', label: 'Financial Markets' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg border-b-2 transition-colors
                ${activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                  : 'border-transparent text-slate-500 hover:text-emerald-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'trade' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {TRADE_HEADLINES.map((item, i) => <TradeCard key={i} item={item} />)}
          </div>
        )}

        {activeTab === 'markets' && (
          <div className="grid sm:grid-cols-3 gap-3">
            {tickers.map((t, i) => <TickerCard key={i} ticker={t} />)}
          </div>
        )}
      </div>
    </section>
  );
}
