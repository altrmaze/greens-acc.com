import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchObjects } from '../services/greenContainer';
import { supabase } from '../supabaseClient';

const DOMAINS = ['all', 'identity', 'document', 'financial_authorization', 'household_profile', 'travel_profile'];

function Skeleton() {
  return <div className="animate-pulse bg-slate-800 rounded-lg h-10 w-full" />;
}

export default function Documents() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [objects, setObjects] = useState([]);
  const [domain, setDomain] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(null);
  const fileRef = useRef();
  const [containerId, setContainerId] = useState(null);

  const load = async () => {
    if (!user) return;
    try {
      const c = await fetchContainer(user.id);
      setContainerId(c.id);
      const objs = await fetchObjects(c.id);
      setObjects(objs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const filtered = domain === 'all' ? objects : objects.filter((o) => o.vault_domain === domain);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !containerId) return;
    setUploading(true);
    try {
      const path = `${containerId}/${Date.now()}_${file.name}`;
      const { error: storageErr } = await supabase.storage.from('gc-documents').upload(path, file);
      if (storageErr && storageErr.message !== 'Bucket not found') throw storageErr;

      const { error: dbErr } = await supabase.from('green_container_objects').insert({
        container_id: containerId,
        object_name: file.name,
        vault_domain: 'document',
        storage_path: path,
        integrity_status: 'verified',
      });
      if (dbErr) throw dbErr;
      await load();
    } catch (err) {
      alert(t('common.error') + ': ' + err.message);
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  };

  const handleDownload = async (obj) => {
    if (!obj.storage_path) { alert(t('common.comingSoon')); return; }
    const { data } = await supabase.storage.from('gc-documents').download(obj.storage_path);
    if (!data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = obj.object_name;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-emerald-400">📄 {t('documents.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              {DOMAINS.map((d) => (
                <option key={d} value={d}>{d === 'all' ? 'All Domains' : d}</option>
              ))}
            </select>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {uploading ? t('common.loading') : `+ ${t('documents.upload')}`}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-start">{t('common.name')}</th>
                  <th className="px-4 py-3 text-start">{t('documents.domain')}</th>
                  <th className="px-4 py-3 text-start">{t('documents.integrity')}</th>
                  <th className="px-4 py-3 text-start">{t('documents.uploadedAt')}</th>
                  <th className="px-4 py-3 text-start">{t('documents.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-2"><Skeleton /></td></tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{t('documents.noDocuments')}</td></tr>
                ) : filtered.map((obj) => (
                  <tr key={obj.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-200 font-medium">{obj.object_name}</td>
                    <td className="px-4 py-3 text-slate-400">{obj.vault_domain}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        obj.integrity_status === 'verified'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>{obj.integrity_status ?? 'unknown'}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {obj.created_at ? new Date(obj.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelected(obj)}
                          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                        >{t('common.view')}</button>
                        <button
                          onClick={() => window.print()}
                          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                        >{t('common.print')}</button>
                        <button
                          onClick={() => handleDownload(obj)}
                          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                        >{t('common.download')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Modal */}
        {selected && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-emerald-400 font-bold mb-4">{selected.object_name}</h3>
              <dl className="space-y-2 text-sm">
                {Object.entries(selected).map(([k, v]) => v != null && (
                  <div key={k} className="flex gap-2">
                    <dt className="text-slate-500 w-32 flex-shrink-0">{k}</dt>
                    <dd className="text-slate-300 break-all">{String(v)}</dd>
                  </div>
                ))}
              </dl>
              <button onClick={() => setSelected(null)} className="mt-6 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-2 text-sm transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
