import React, { useState } from 'react';

export default function StockPredictorButton() {
  const [prediction, setPrediction] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    setPrediction('');
    try {
      const response = await fetch('http://localhost:8000/api/v1/predict-best-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watch_list: ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMD'] })
      });
      const data = await response.json();
      setPrediction(data.recommended_stock);
    } catch (error) {
      setPrediction('Error executing multi-agent market scan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#ffffff', borderRadius: '8px' }}>
      <button
        onClick={handleScan}
        disabled={loading}
        style={{
          backgroundColor: '#00c853',
          color: '#ffffff',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        {loading ? 'Agents Analyzing Market Data...' : 'Generate Promising Stock Setup'}
      </button>

      {prediction && (
        <div style={{ marginTop: '20px', whiteSpace: 'pre-line', borderLeft: '4px solid #00c853', paddingLeft: '15px' }}>
          <h3>🎯 Investment Committee Recommendation</h3>
          <p>{prediction}</p>
        </div>
      )}
    </div>
  );
}
