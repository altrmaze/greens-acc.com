import React, { useEffect, useState } from 'react';

const ACCREDITED_LABS = [
  { id: 'lab-1', name: 'SGS International Labs', countries: ['Global', 'China', 'USA'] },
  { id: 'lab-2', name: 'TÜV Rheinland', countries: ['Germany', 'Japan', 'UAE'] },
  { id: 'lab-3', name: 'China Inspection & Certification (CCIC)', countries: ['China'] }
];

export default function GreensActiveWaitingArea() {
  const [documents, setDocuments] = useState({
    legalCert: { uploaded: false, verified: false, file: null, name: 'الشهادات القانونية ومطابقة المواصفات' },
    labTest: { uploaded: false, verified: false, file: null, name: 'شهادة المختبر المعتمد من الموقع' },
    logisticsProof: { uploaded: false, verified: false, file: null, name: 'إثبات وجود السلعة وموقع التخزين والتسليم' }
  });
  const [selectedLab, setSelectedLab] = useState('');
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState('Waiting for documents...');
  const [activeTab, setActiveTab] = useState('checklist');

  const isReadyForMeeting =
    documents.legalCert.verified && documents.labTest.verified && documents.logisticsProof.verified;

  useEffect(() => {
    if (isReadyForMeeting) {
      setAiAnalysisStatus('All required files were verified. Ready to open the meeting room.');
    }
  }, [isReadyForMeeting]);

  const handleFileUpload = (docKey, fileName) => {
    setDocuments((prev) => ({
      ...prev,
      [docKey]: { ...prev[docKey], uploaded: true, file: fileName }
    }));

    setAiAnalysisStatus(`جاري فحص مستند: ${documents[docKey].name}...`);
    setTimeout(() => {
      setDocuments((prev) => ({
        ...prev,
        [docKey]: { ...prev[docKey], verified: true }
      }));
      setAiAnalysisStatus('تم اعتماد ومطابقة المستند بنجاح!');
    }, 2500);
  };

  return (
    <main style={{ maxWidth: 900, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Greens ACC Waiting Area Dashboard</h1>
      <p>{isReadyForMeeting ? 'Meeting room unlocked.' : 'Waiting for full document verification.'}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setActiveTab('checklist')}>
          Checklist
        </button>
        <button type="button" onClick={() => setActiveTab('ai-secretary')}>
          AI Secretary
        </button>
      </div>

      {activeTab === 'checklist' && (
        <section>
          <label htmlFor="lab-select">Accredited Lab</label>
          <select
            id="lab-select"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
            style={{ display: 'block', margin: '8px 0 16px' }}
          >
            <option value="">Select lab</option>
            {ACCREDITED_LABS.map((lab) => (
              <option key={lab.id} value={lab.id}>
                {lab.name} ({lab.countries.join(', ')})
              </option>
            ))}
          </select>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {Object.entries(documents).map(([key, doc]) => (
              <li key={key} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <strong>{doc.name}</strong>
                <div>Uploaded: {doc.uploaded ? `Yes (${doc.file})` : 'No'}</div>
                <div>Verified: {doc.verified ? 'Yes' : 'No'}</div>
                <button
                  type="button"
                  disabled={doc.uploaded}
                  onClick={() => handleFileUpload(key, `${key}.pdf`)}
                  style={{ marginTop: 8 }}
                >
                  {doc.uploaded ? 'Uploaded' : 'Upload demo file'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTab === 'ai-secretary' && (
        <section>
          <h2>AI Secretary</h2>
          <p>{aiAnalysisStatus}</p>
        </section>
      )}
    </main>
  );
}
