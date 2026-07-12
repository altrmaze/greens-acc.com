import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { isSpeechSupported, createSpeechEngine } from '../voice/speechEngine';
import { parseIntent } from '../voice/intentParser';

const EXAMPLE_COMMANDS = [
  'Show documents',
  'Open travel',
  'Show bills',
  'Open household',
  'Open settings',
  'Show activity',
  'Switch to Arabic',
  'Switch to English',
  'Print page',
  'Log out',
];

export default function Voice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [intent, setIntent] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [confirm, setConfirm] = useState(null);
  const recognitionRef = useRef(null);

  const handleIntent = (parsed) => {
    setIntent(parsed);
    if (parsed.intent === 'UNKNOWN') return;

    if (parsed.action === 'print') { window.print(); return; }
    if (parsed.action === 'lang_ar') { i18n.changeLanguage('ar'); return; }
    if (parsed.action === 'lang_en') { i18n.changeLanguage('en'); return; }
    if (parsed.action === 'logout') { signOut(); return; }
    if (parsed.route) setConfirm(parsed);
  };

  const startListening = () => {
    if (!isSpeechSupported) return;
    const recognition = createSpeechEngine();
    recognition.lang = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (e) => {
      const t = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setTranscript(t);
      if (e.results[e.results.length - 1].isFinal) {
        handleIntent(parseIntent(t));
      }
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    handleIntent(parseIntent(textInput));
    setTextInput('');
  };

  const confirmNav = () => {
    if (confirm?.route) navigate(confirm.route);
    setConfirm(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">🎙️ {t('voice.title')}</h1>

        {/* Mic Button */}
        <div className="flex flex-col items-center my-10">
          {isSpeechSupported ? (
            <button
              onClick={listening ? stopListening : startListening}
              className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all shadow-lg ${
                listening
                  ? 'bg-emerald-500 shadow-emerald-500/40 scale-110 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              🎤
            </button>
          ) : (
            <div className="bg-slate-800 rounded-xl px-4 py-3 text-sm text-amber-400 text-center">
              {t('voice.unsupported')}
            </div>
          )}
          {listening && (
            <p className="mt-4 text-emerald-400 text-sm font-semibold animate-pulse">{t('voice.listening')}</p>
          )}
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-slate-500 mb-1">{t('voice.transcript')}:</p>
            <p className="text-slate-200 italic">"{transcript}"</p>
          </div>
        )}

        {/* Detected Intent */}
        {intent && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-semibold ${
            intent.intent === 'UNKNOWN'
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {t('voice.intent')}: {intent.intent === 'UNKNOWN' ? t('voice.noIntent') : intent.intent}
          </div>
        )}

        {/* Text Fallback */}
        <form onSubmit={handleTextSubmit} className="flex gap-2 mb-8">
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={t('voice.fallback')}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >→</button>
        </form>

        {/* Example Commands */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('voice.exampleCommands')}</h2>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_COMMANDS.map((cmd) => (
              <button
                key={cmd}
                onClick={() => { setTranscript(cmd); handleIntent(parseIntent(cmd)); }}
                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
              >{cmd}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-emerald-400 font-bold mb-2">{t('voice.confirmAction')}</h3>
            <p className="text-slate-300 text-sm mb-6">
              {t('voice.confirmMessage')} <strong>{confirm.intent}</strong>?
            </p>
            <div className="flex gap-3">
              <button onClick={confirmNav} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg py-2 text-sm transition-colors">{t('common.confirm')}</button>
              <button onClick={() => setConfirm(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-2 text-sm transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
