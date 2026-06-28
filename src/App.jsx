import React, { useState } from 'react';

const mockCompanyWebsites = {
  'Tokyo Global Tech Experts': {
    hasPublicInfo: true,
    publicData: '✓ التقرير العام: متوفر لدينا شهادات مطابقة للمواصفات القياسية اليابانية مجاناً على الموقع.',
    hasAiAgent: true,
    aiAgentResponse:
      'مرحباً بوكيل Greens ACC. نعم، لدينا فحص خاص متاح للشحنات السمكية، تكلفة الخدمة المشفرة هي 150 دولار.',
    requiresPayment: true,
    price: 150
  },
  'Japan Maritime & Cargo Inspection': {
    hasPublicInfo: false,
    hasAiAgent: false,
    phoneAction: '📞 جاري الاتصال الهاتفي بالدعم البشري... الموظف يؤكد: الفحص الفني يتطلب حجز مسبق بقيمة 200 دولار.',
    requiresPayment: true,
    price: 200
  }
};

export default function GreensAutonomousSecretary() {
  const [selectedCompany, setSelectedCompany] = useState('Tokyo Global Tech Experts');
  const [agentStep, setAgentStep] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [showDialog, setShowDialog] = useState(false);

  const addLog = (message) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const startInquiry = () => {
    setAgentStep('asking');
    setShowDialog(true);
    addLog(`👩‍💼 السكرتير: رصدت حاجة لشركة خبيرة. هل تريدون مني الاستعانة بشركة "${selectedCompany}" وفحص خدماتها؟`);
  };

  const handleUserApproval = (approved) => {
    if (!approved) {
      setAgentStep('idle');
      setShowDialog(false);
      addLog('❌ تم إلغاء الاستدعاء بناءً على رغبة المستخدم.');
      return;
    }

    setShowDialog(false);
    setAgentStep('scanning');
    addLog('🌐 جاري الانتقال لموقع الشركة الالكتروني وقراءة البيانات المتاحة علناً...');

    setTimeout(() => {
      const companyData = mockCompanyWebsites[selectedCompany];
      if (companyData.hasPublicInfo) {
        addLog(`📄 تم العثور على معلومات عامة على الصفحة دون الحاجة للاتصال: ${companyData.publicData}`);
        checkPaymentLogic(companyData);
      } else {
        addLog('⚠️ لم يتم العثور على معلومات كافية في الصفحة العامة للشركة.');
        proceedToAiAgent(companyData);
      }
    }, 2000);
  };

  const proceedToAiAgent = (companyData) => {
    if (companyData.hasAiAgent) {
      setAgentStep('agent-chat');
      addLog('🤖 السكرتير يدخل في حوار مع الـ AI الخاص بموقع الشركة الخبيرة...');
      setTimeout(() => {
        addLog(`💬 رد الـ AI الخاص بهم: "${companyData.aiAgentResponse}"`);
        checkPaymentLogic(companyData);
      }, 2000);
    } else {
      proceedToPhoneCall(companyData);
    }
  };

  const proceedToPhoneCall = (companyData) => {
    setAgentStep('calling');
    addLog('📱 لا يوجد نظام AI على موقعهم. السكرتير يقوم بإجراء اتصال هاتفي تلقائي بالشركة الآن...');
    setTimeout(() => {
      addLog(companyData.phoneAction);
      checkPaymentLogic(companyData);
    }, 2500);
  };

  const checkPaymentLogic = (companyData) => {
    if (companyData.requiresPayment) {
      setAgentStep('payment-approval');
      addLog(
        `💰 تنبيه مالي: الخدمة المطلوبة تتطلب دفع مبلغ [${companyData.price}$]. يتوقف السكرتير الآن للاستشارة وعرض الأمر على أطراف الصفقة.`
      );
    } else {
      setAgentStep('completed');
      addLog('✅ تمت العملية بنجاح وتوفير كافة البيانات المطلوبة مجاناً وبأمان.');
    }
  };

  const handlePaymentDecision = (paymentApproved) => {
    if (paymentApproved) {
      setAgentStep('completed');
      addLog(
        `💳 تم الموافقة على الدفع وسحب [${mockCompanyWebsites[selectedCompany].price}$] من محفظة Greens ACC المخصصة للصفقة. تم حجز الخبير بنجاح!`
      );
    } else {
      setAgentStep('idle');
      addLog('❌ تم رفض دفع المبلغ من قبل الشركاء. تم إغلاق طلب الاستعانة بالشركة.');
    }
  };

  return (
    <main style={{ maxWidth: 950, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>Greens ACC Autonomous Secretary</h1>
      <p>Agent state: {agentStep}</p>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <label htmlFor="company">Expert company</label>
        <select
          id="company"
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          disabled={agentStep !== 'idle' && agentStep !== 'completed'}
        >
          {Object.keys(mockCompanyWebsites).map((company) => (
            <option key={company} value={company}>
              {company}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={startInquiry}
          disabled={agentStep !== 'idle' && agentStep !== 'completed'}
        >
          Start inquiry
        </button>
      </div>

      {showDialog && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p>Approve secretary request for "{selectedCompany}"?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => handleUserApproval(true)}>
              Approve
            </button>
            <button type="button" onClick={() => handleUserApproval(false)}>
              Reject
            </button>
          </div>
        </section>
      )}

      {agentStep === 'payment-approval' && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p>Payment approval needed: ${mockCompanyWebsites[selectedCompany].price}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => handlePaymentDecision(true)}>
              Approve payment
            </button>
            <button type="button" onClick={() => handlePaymentDecision(false)}>
              Decline payment
            </button>
          </div>
        </section>
      )}

      <section>
        <h2>Audit log</h2>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, minHeight: 180 }}>
          {logs.length === 0 ? (
            <p>No activity yet.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {logs.map((entry, idx) => (
                <li key={`${entry}-${idx}`}>{entry}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
