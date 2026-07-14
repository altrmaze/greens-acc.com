import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchObjects } from '../services/greenContainer';
import { dispatchTask } from '../services/agentOrchestrator';

const FORM_TYPES = [
  { value: '', label: '— Select Form Type —' },
  { value: 'passport_renewal', label: 'Passport Renewal' },
  { value: 'visa_application', label: 'Visa Application' },
  { value: 'vehicle_registration', label: 'Vehicle Registration' },
  { value: 'driving_license_renewal', label: 'Driving License Renewal' },
  { value: 'tax_return', label: 'Tax Return' },
  { value: 'health_insurance', label: 'Health Insurance Application' },
];

const REQUIRED_FIELDS = {
  passport_renewal: ['full_name', 'date_of_birth', 'nationality', 'current_passport_number'],
  visa_application: ['full_name', 'date_of_birth', 'nationality', 'destination_country'],
  vehicle_registration: ['full_name', 'vehicle_make', 'vehicle_model', 'plate_number'],
  driving_license_renewal: ['full_name', 'date_of_birth', 'license_number'],
  tax_return: ['full_name', 'national_id', 'tax_year'],
  health_insurance: ['full_name', 'date_of_birth', 'national_id'],
};

export default function Forms() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formType, setFormType] = useState('');
  const [fields, setFields] = useState({});
  const [container, setContainer] = useState(null);
  const [gcFields, setGcFields] = useState({});
  const [dispatching, setDispatching] = useState(false);
  const [taskMsg, setTaskMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const c = await fetchContainer(user.id);
        setContainer(c);
        const objs = await fetchObjects(c.id);
        const identity = objs.filter((o) => o.vault_domain === 'identity');
        const merged = identity.reduce((acc, o) => ({ ...acc, ...(o.metadata ?? {}) }), {});
        setGcFields(merged);
      } catch {}
    })();
  }, [user]);

  useEffect(() => {
    if (!formType) { setFields({}); return; }
    const required = REQUIRED_FIELDS[formType] ?? [];
    const prefilled = {};
    required.forEach((f) => { if (gcFields[f]) prefilled[f] = gcFields[f]; });
    setFields(prefilled);
  }, [formType, gcFields]);

  const required = REQUIRED_FIELDS[formType] ?? [];
  const missing = required.filter((f) => !fields[f]);

  const handlePrepare = async () => {
    if (!container || !formType) return;
    setDispatching(true);
    try {
      const task = await dispatchTask({
        agentId: 'form_assistant',
        taskType: 'prepare_form',
        containerId: container.id,
        userId: user.id,
        payload: { form_type: formType, fields },
      });
      setTaskMsg(`Form preparation task created: ${task.id}`);
    } catch (err) {
      setTaskMsg('Error: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">📝 {t('forms.title')}</h1>
        <p className="text-slate-400 text-sm mb-6">{t('forms.subtitle')}</p>

        {/* Notice */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-blue-300">
          {t('forms.comingSoon')}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="mb-5">
            <label className="block text-xs text-slate-400 mb-1">{t('forms.selectForm')}</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {FORM_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {formType && (
            <>
              <div className="space-y-4 mb-5">
                {required.map((field) => (
                  <div key={field}>
                    <label className={`block text-xs mb-1 ${missing.includes(field) ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}>
                      {field.replace(/_/g, ' ')} {missing.includes(field) && '⚠️'}
                    </label>
                    <input
                      value={fields[field] ?? ''}
                      onChange={(e) => setFields((p) => ({ ...p, [field]: e.target.value }))}
                      className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none transition-colors ${
                        missing.includes(field)
                          ? 'border-orange-500/50 focus:border-orange-400'
                          : 'border-slate-700 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {missing.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 mb-5 text-xs text-orange-400">
                  {t('forms.missingFields')}: {missing.join(', ')}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handlePrepare}
                  disabled={dispatching}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
                >{dispatching ? t('common.loading') : t('forms.prepare')}</button>
                <button
                  onClick={() => setFields({})}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg py-2.5 text-sm border border-slate-700 transition-colors"
                >{t('forms.saveDraft')}</button>
                <button
                  onClick={() => window.print()}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg py-2.5 text-sm border border-slate-700 transition-colors"
                >{t('common.print')}</button>
              </div>
              {taskMsg && <p className="text-xs text-emerald-400 mt-3">{taskMsg}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
