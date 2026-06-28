// Minimal Meeting Suite client
// Uses Supabase edge functions for room management, AI analysis, and Supabase Realtime for signaling

const functionHost = '/supabase/functions';

// Supabase realtime signaling (optional) - initialize if config provided
let supabase = null;
let supabaseSubscription = null;
const clientId = (() => {
  try { return crypto.randomUUID(); } catch (e) { return `client-${Date.now()}-${Math.floor(Math.random()*10000)}`; }
})();

function initSupabase() {
  const cfg = window.SUPABASE_CONFIG;
  if (!cfg || !cfg.url || !cfg.anonKey) return null;
  try {
    supabase = window.supabase.createClient(cfg.url, cfg.anonKey);
    console.info('Supabase client initialized for signaling');
    return supabase;
  } catch (err) {
    console.warn('Failed to init Supabase', err);
    supabase = null;
    return null;
  }
}

// ----- Global news ticker & risk subscriptions -----
let globalRiskActive = false;
let currentRisk = null;
let worldClockInterval = null;

const majorCityClocks = [
  { city: 'New York', country: 'USA', timeZone: 'America/New_York', locale: 'en-US' },
  { city: 'Los Angeles', country: 'USA', timeZone: 'America/Los_Angeles', locale: 'en-US' },
  { city: 'London', country: 'UK', timeZone: 'Europe/London', locale: 'en-GB' },
  { city: 'Paris', country: 'France', timeZone: 'Europe/Paris', locale: 'fr-FR' },
  { city: 'Dubai', country: 'UAE', timeZone: 'Asia/Dubai', locale: 'ar-AE' },
  { city: 'Mumbai', country: 'India', timeZone: 'Asia/Kolkata', locale: 'hi-IN' },
  { city: 'Singapore', country: 'Singapore', timeZone: 'Asia/Singapore', locale: 'en-SG' },
  { city: 'Tokyo', country: 'Japan', timeZone: 'Asia/Tokyo', locale: 'ja-JP' },
  { city: 'Sydney', country: 'Australia', timeZone: 'Australia/Sydney', locale: 'en-AU' },
  { city: 'São Paulo', country: 'Brazil', timeZone: 'America/Sao_Paulo', locale: 'pt-BR' }
];

function getClockLocale(defaultLocale) {
  const localeSelect = document.getElementById('clock-locale');
  if (!localeSelect || localeSelect.value === 'auto') return defaultLocale;
  return localeSelect.value;
}

function formatClockDateTime(now, cityConfig) {
  const locale = getClockLocale(cityConfig.locale);
  const timeText = new Intl.DateTimeFormat(locale, {
    timeZone: cityConfig.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);

  const dateText = new Intl.DateTimeFormat(locale, {
    timeZone: cityConfig.timeZone,
    weekday: 'short',
    month: 'short',
    day: '2-digit'
  }).format(now);

  return { timeText, dateText };
}

function renderWorldClockBar() {
  const bar = document.getElementById('world-clock-bar');
  if (!bar) return;
  const now = new Date();
  bar.textContent = '';

  majorCityClocks.forEach(cityConfig => {
    const tile = document.createElement('div');
    tile.className = 'clock-tile';

    const city = document.createElement('div');
    city.className = 'clock-city';
    city.textContent = cityConfig.city;

    const meta = document.createElement('div');
    meta.className = 'clock-meta';
    const countryLabel = typeof cityConfig.country === 'object' && cityConfig.country !== null
      ? (cityConfig.country.name || '')
      : cityConfig.country;
    meta.textContent = `${countryLabel} • ${cityConfig.timeZone}`;

    const clock = document.createElement('div');
    clock.className = 'clock-time';
    const formatted = formatClockDateTime(now, cityConfig);
    clock.textContent = `${formatted.timeText} • ${formatted.dateText}`;

    tile.appendChild(city);
    tile.appendChild(meta);
    tile.appendChild(clock);
    bar.appendChild(tile);
  });
}

function initWorldClockBar() {
  const localeSelect = document.getElementById('clock-locale');
  if (localeSelect) {
    localeSelect.addEventListener('change', renderWorldClockBar);
  }
  renderWorldClockBar();
  if (worldClockInterval) clearInterval(worldClockInterval);
  worldClockInterval = setInterval(renderWorldClockBar, 1000);
}

async function initNewsAndRisk() {
  if (!supabase) return;
  try {
    // initial news load
    const { data: news, error: newsErr } = await supabase.from('global_news').select('*').order('created_at', { ascending: false }).limit(50);
    if (!newsErr && Array.isArray(news)) renderTicker(news.reverse());

    // subscribe to new incoming news
    supabase
      .channel('global_news:public')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_news' }, payload => {
        const rec = payload.record || payload.new || payload;
        if (!rec) return;
        prependTickerItem(rec);
      })
      .subscribe();

    // subscribe to risk flags
    supabase
      .channel('global_risk_flags:public')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_risk_flags' }, payload => {
        const rec = payload.record || payload.new || payload;
        if (!rec) return;
        if (rec.active) handleRiskFlag(rec);
      })
      .subscribe();
  } catch (e) {
    console.warn('initNewsAndRisk failed', e);
  }
}

function renderTicker(newsList) {
  const ticker = document.getElementById('global-news-ticker');
  if (!ticker) return;
  const items = newsList.map(n => `[${(n.source||'src').toUpperCase()}] ${n.title}`).join(' \u00A0 • \u00A0 ');
  ticker.innerHTML = `<div class="ticker-track">${escapeHtml(items)}</div>`;
}

function prependTickerItem(item) {
  const ticker = document.getElementById('global-news-ticker');
  if (!ticker) return;
  const track = ticker.querySelector('.ticker-track');
  const newItem = `[${(item.source||'src').toUpperCase()}] ${item.title}`;
  if (track) track.textContent = `${newItem} \u00A0 • \u00A0 ${track.textContent}`;
  else ticker.innerHTML = `<div class="ticker-track">${escapeHtml(newItem)}</div>`;
}

function handleRiskFlag(flagRec) {
  globalRiskActive = true;
  currentRisk = flagRec;
  showEmergencyModal(flagRec.reason || 'Critical event detected');
  // optionally notify AI agents to generate suggestions
  postAiEvent({ type: 'risk_alert', room: activeRoom?.id, text: flagRec.reason || '', metadata: flagRec });
}

function clearRisk() {
  globalRiskActive = false;
  currentRisk = null;
  hideEmergencyModal();
}

function showEmergencyModal(message) {
  const modal = document.getElementById('emergency-modal');
  if (!modal) return;
  const body = document.getElementById('emergency-body');
  const title = document.getElementById('emergency-title');
  title.textContent = 'Critical Global Event';
  body.textContent = message;
  modal.classList.remove('hidden');
}

function hideEmergencyModal() {
  const modal = document.getElementById('emergency-modal');
  if (!modal) return;
  modal.classList.add('hidden');
}

// expose helper for handshake checks
window.checkGlobalRiskBeforeHandshake = async function () {
  if (!supabase) initSupabase();
  try {
    const { data, error } = await supabase.from('global_risk_flags').select('*').eq('active', true).limit(1);
    if (error) return { ok: true, active: false };
    if (Array.isArray(data) && data.length > 0) return { ok: false, active: true, flag: data[0] };
    return { ok: true, active: false };
  } catch (e) {
    console.warn('checkGlobalRiskBeforeHandshake error', e);
    return { ok: true, active: false };
  }
};

// Listen for global handshake attempts from other UI components
window.addEventListener('attemptHandshake', async (ev) => {
  const res = await window.checkGlobalRiskBeforeHandshake();
  if (!res.ok || res.active) {
    // dispatch blocked event and show modal
    const blocked = new CustomEvent('handshakeBlocked', { detail: res });
    window.dispatchEvent(blocked);
    if (res.flag) handleRiskFlag(res.flag);
  } else {
    window.dispatchEvent(new CustomEvent('handshakeAllowed'));
  }
});

// modal action wiring
document.addEventListener('click', (e) => {
  const target = e.target;
  if (!target) return;
  if (target.id === 'emergency-halt') {
    // Halt handshake: dispatch a global halt event
    window.dispatchEvent(new CustomEvent('handshakeHalted', { detail: { reason: currentRisk } }));
    appendChat('Handshake halted due to critical global event.', 'AI');
  }
  if (target.id === 'emergency-suggest') {
    // Ask AI agents for a suggested mitigation and show it
    postAiEvent({ type: 'request_mitigation', room: activeRoom?.id, text: currentRisk?.reason || 'Please propose mitigation' });
  }
  if (target.id === 'emergency-dismiss') {
    clearRisk();
  }
});

async function subscribeToSignals(roomId, onSignal) {
  if (!supabase) return null;
  // unsubscribe previous
  try { if (supabaseSubscription) await supabaseSubscription.unsubscribe(); } catch (e) {}
  const filter = `room_id=eq.${roomId}`;
  supabaseSubscription = supabase
    .channel(`room_signals:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'meeting_signals', filter }, (payload) => {
      const rec = payload.record || payload.new || payload;
      if (!rec) return;
      onSignal(rec);
    })
    .subscribe();
  return supabaseSubscription;
}

async function createSignal(roomId, senderId, targetId, type, data) {
  if (!supabase) return null;
  try {
    const resp = await supabase.from('meeting_signals').insert([{ room_id: roomId, sender_id: senderId, target_id: targetId, signal_type: type, signal_data: data }]);
    return resp;
  } catch (err) {
    console.warn('Failed to create signal', err);
    return null;
  }
}

// UI elements
const roomsGrid = document.getElementById('rooms-grid');
const listRoomsBtn = document.getElementById('list-rooms');
const createRoomBtn = document.getElementById('create-room');
const globalStatus = document.getElementById('global-status');
const activeRoomTitle = document.getElementById('active-room-title');
const activeRoomSub = document.getElementById('active-room-sub');
const roomOccupancy = document.getElementById('room-occupancy');
const joinRoomBtn = document.getElementById('join-room');
const leaveRoomBtn = document.getElementById('leave-room');
const toggleAudioBtn = document.getElementById('toggle-audio');
const toggleVideoBtn = document.getElementById('toggle-video');
const videoGrid = document.getElementById('video-grid');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const sendChat = document.getElementById('send-chat');
const aiInsights = document.getElementById('ai-insights');
const ai1Status = document.getElementById('ai1-status');
const ai2Status = document.getElementById('ai2-status');
const ai3Status = document.getElementById('ai3-status');
const fileInput = document.getElementById('file-input');
const uploadFileBtn = document.getElementById('upload-file');

let rooms = [];
let activeRoom = null;
let localStream = null;
let peers = {};

async function fetchRooms() {
  // For demo: generate 10 static rooms with minimal metadata
  rooms = Array.from({ length: 10 }).map((_, i) => ({
    id: `room-${i + 1}`,
    name: `Executive Room ${i + 1}`,
    capacity: 50,
    occupants: 0
  }));
  renderRooms();
}

function renderRooms() {
  roomsGrid.innerHTML = '';
  rooms.forEach(r => {
    const el = document.createElement('div');
    el.className = 'p-3 bg-slate-50 rounded-lg border border-slate-200';
    el.innerHTML = `<div class="flex items-center justify-between"><div><strong>${r.name}</strong><div class="text-xs text-slate-500">${r.occupants} / ${r.capacity}</div></div><div><button data-room="${r.id}" class="join-btn px-3 py-1 bg-emerald-600 text-white rounded">Join</button></div></div>`;
    roomsGrid.appendChild(el);
  });
  document.querySelectorAll('.join-btn').forEach(btn => btn.addEventListener('click', (e) => {
    const rid = e.currentTarget.dataset.room;
    selectRoom(rid);
  }));
}

function selectRoom(id) {
  activeRoom = rooms.find(r => r.id === id);
  activeRoomTitle.textContent = activeRoom.name;
  activeRoomSub.textContent = `Room ID: ${activeRoom.id}`;
  roomOccupancy.textContent = `${activeRoom.occupants} / ${activeRoom.capacity}`;
  globalStatus.textContent = `Selected ${activeRoom.name}`;
  aiInsights.innerHTML = '';
}

async function createRoom() {
  // placeholder: push a room creation call to backend if required
  globalStatus.textContent = 'Created new room (local only)';
}

async function joinRoom() {
  if (!activeRoom) return alert('Select a room first');
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = localStream;
    videoGrid.appendChild(video);
    // initialize Supabase for signaling if configured
    initSupabase();
    if (supabase) {
      await subscribeToSignals(activeRoom.id, handleIncomingSignal);
    }
    appendChat('You joined the room. Local AV enabled.');
    // Notify AI agents of join event
    postAiEvent({ type: 'join', room: activeRoom.id, text: 'Participant joined the room.' });
    // create a simple-peer and announce offer via Supabase signaling
    const peer = new SimplePeer({ initiator: true, trickle: true, stream: localStream });
    peers[clientId] = peer;
    peer.on('signal', async data => {
      // broadcast offer via signaling table
      await createSignal(activeRoom.id, clientId, null, 'offer', data);
    });
    peer.on('stream', remoteStream => {
      const rv = document.createElement('video'); rv.autoplay = true; rv.playsInline = true; rv.srcObject = remoteStream; videoGrid.appendChild(rv);
    });
    peer.on('error', e => console.warn('Peer error', e));
  } catch (err) {
    appendChat('Failed to access media: ' + err.message);
  }
}

async function handleIncomingSignal(rec) {
  try {
    if (!rec || rec.sender_id === clientId) return;
    const sender = rec.sender_id;
    const type = rec.signal_type;
    const data = rec.signal_data;
    // if we don't have a peer for this sender, create a listener peer
    if (!peers[sender]) {
      const peer = new SimplePeer({ initiator: false, trickle: true, stream: localStream });
      peers[sender] = peer;
      peer.on('signal', async d => {
        await createSignal(activeRoom.id, clientId, sender, 'answer', d);
      });
      peer.on('stream', remoteStream => {
        const rv = document.createElement('video'); rv.autoplay = true; rv.playsInline = true; rv.srcObject = remoteStream; videoGrid.appendChild(rv);
      });
      peer.on('error', e => console.warn('Peer error', e));
    }
    const peer = peers[sender];
    // signal the peer with incoming data
    try { peer.signal(data); } catch (e) { console.warn('Signal apply failed', e); }
  } catch (err) {
    console.error('handleIncomingSignal error', err);
  }
}

function leaveRoom() {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  videoGrid.innerHTML = '<p class="text-sm text-slate-500">Video feeds appear here (local preview + peers)</p>';
  appendChat('You left the room.');
}

function appendChat(msg, who = 'System') {
  const p = document.createElement('div');
  p.className = 'mb-1';
  p.innerHTML = `<strong>${who}:</strong> <span>${escapeHtml(msg)}</span>`;
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  appendChat(text, 'You');
  chatInput.value = '';
  // broadcast via backend (placeholder) and notify AI agents
  postAiEvent({ type: 'message', room: activeRoom?.id, text });
}

async function postAiEvent(event) {
  try {
    const resp = await fetch(`${functionHost}/aiAgentAnalyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event)
    });
    const data = await resp.json();
    if (resp.ok && data?.insights) {
      data.insights.forEach(i => showAiInsight(i));
    }
  } catch (err) {
    console.error('AI call failed', err);
  }
}

function showAiInsight(text) {
  const div = document.createElement('div');
  div.className = 'p-2 bg-emerald-50 border border-emerald-100 rounded';
  div.textContent = text;
  aiInsights.prepend(div);
}

async function uploadFile() {
  const f = fileInput.files?.[0];
  if (!f) return alert('Choose a file');
  appendChat(`Uploading file ${f.name}...`);
  // placeholder: upload to Supabase storage via edge function or direct API
  postAiEvent({ type: 'file', room: activeRoom?.id, filename: f.name });
}

// wire UI
createRoomBtn.addEventListener('click', createRoom);
listRoomsBtn.addEventListener('click', fetchRooms);
joinRoomBtn.addEventListener('click', joinRoom);
leaveRoomBtn.addEventListener('click', leaveRoom);
sendChat.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
uploadFileBtn.addEventListener('click', uploadFile);

document.addEventListener('DOMContentLoaded', () => {
  fetchRooms();
  initWorldClockBar();
  initSupabase();
  initNewsAndRisk();
});

// simple heartbeat to AI agent statuses (demo)
setInterval(() => {
  ai1Status.textContent = 'active'; ai2Status.textContent = 'active'; ai3Status.textContent = 'active';
}, 5000);

// ----- INSTANT SECURE ROOM CREATION -----
let currentRoomToken = null;
let currentEncryptionKey = null;

async function generateInstantRoom() {
  const companyName = document.getElementById('instant-company-name').value.trim();
  if (!companyName) {
    alert('Please enter your company name');
    return;
  }

  const btn = document.getElementById('generate-instant-room-btn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const response = await fetch(`${functionHost}/generateInstantRoom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creator_company: companyName })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate room');
    }

    currentRoomToken = data.room_token;
    currentEncryptionKey = data.encryption_key;

    const output = document.getElementById('instant-room-output');
    const link = document.getElementById('share-link');
    link.textContent = data.share_link;
    output.classList.remove('hidden');

    appendChat(`Instant room created! Share this link for instant entry: ${data.share_link}. $20 session fee required.`, 'System');
    btn.textContent = 'Generate Link';
    btn.disabled = false;
  } catch (err) {
    alert(`Error: ${err.message}`);
    btn.textContent = 'Generate Link';
    btn.disabled = false;
  }
}

// ----- DOCUMENT BRIDGE & FILE STREAMING -----
async function registerDocument() {
  if (!activeRoom) {
    alert('Select a room first');
    return;
  }

  const docName = prompt('Document name (e.g., contract.pdf):');
  if (!docName) return;

  try {
    const response = await fetch(`${functionHost}/documentBridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: activeRoom.id,
        document_name: docName,
        document_type: docName.includes('contract') ? 'contract' : 'document',
        uploaded_by: clientId
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to register document');
    }

    appendChat(`Document "${docName}" registered for secure streaming. Ready for instant recall.`, 'System');
  } catch (err) {
    appendChat(`Document bridge error: ${err.message}`, 'System');
  }
}

// ----- AI EXECUTIVE SECRETARY TOOLS -----
async function runSecretaryCommand(action, query) {
  const output = document.getElementById('secretary-output');
  output.classList.remove('hidden');
  output.textContent = 'Processing...';

  try {
    const response = await fetch(`${functionHost}/aiSecretaryTools`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action,
        document_text: query || 'Sample contract content',
        query: query || 'Please summarize',
        currency_pair: query || 'USD/EUR'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Secretary error');
    }

    // Format and display result
    let html = `<strong>${action}:</strong><br>`;
    if (data.result) {
      if (action === 'summarize') {
        html += `<p>📄 ${data.result.executive_summary}</p>`;
        html += `<p>Reading time: ${data.result.reading_time_minutes} min, ${data.result.word_count} words</p>`;
      } else if (action === 'parse') {
        html += `<p>Found ${data.result.matching_clauses.length} relevant clauses</p>`;
        html += `<p>⚠️ ${data.result.potential_weaknesses.length} potential weaknesses identified</p>`;
      } else if (action === 'calculate') {
        html += `<p>💱 ${data.result.currency_pair}: ${data.result.exchange_rate}</p>`;
        html += `<p>Tariff: ${data.result.tariff_estimate.estimated_total_cost}</p>`;
      }
    }

    output.innerHTML = html;
  } catch (err) {
    output.innerHTML = `<span class="text-red-600">Error: ${err.message}</span>`;
  }
}

// ----- AI COMPLIANCE LAWYER & KILL SWITCH -----
let killSwitchActive = false;

async function runComplianceCheck() {
  if (!activeRoom) return;

  try {
    const convoText = Array.from(document.querySelectorAll('#chat-log div')).map(d => d.textContent).join('\n');

    const response = await fetch(`${functionHost}/aiComplianceLawyer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: activeRoom.id,
        conversation_text: convoText,
        document_content: ''
      })
    });

    const data = await response.json();

    if (data.kill_switch_triggered) {
      triggerKillSwitch(data.kill_switch_reason, data.violations);
    } else if (data.violations_detected > 0) {
      appendChat(`⚠️ Compliance warning: ${data.violations_detected} issue(s) detected. Review immediately.`, 'Compliance AI');
    }
  } catch (err) {
    console.warn('Compliance check error', err);
  }
}

function triggerKillSwitch(reason, violations) {
  killSwitchActive = true;
  const modal = document.getElementById('kill-switch-modal');
  const message = document.getElementById('kill-switch-message');
  const details = document.getElementById('violation-details');

  message.textContent = reason || 'This conversation has been terminated due to a compliance violation.';
  details.innerHTML = violations.map(v => `<strong>${v.violation_type}:</strong> ${v.description}`).join('<br>');

  modal.classList.remove('hidden');

  // Disable handshake and payment
  window.dispatchEvent(new CustomEvent('killSwitchTriggered', { detail: { reason, violations } }));
}

// Wire up event listeners
document.getElementById('generate-instant-room-btn').addEventListener('click', generateInstantRoom);
document.getElementById('upload-file').addEventListener('click', function() {
  if (document.getElementById('file-input').files.length > 0) {
    registerDocument();
  }
});

document.getElementById('secretary-query-btn').addEventListener('click', () => {
  const query = document.getElementById('doc-query').value;
  runSecretaryCommand('parse', query);
});

document.getElementById('doc-summarize-btn').addEventListener('click', () => {
  runSecretaryCommand('summarize', '');
});

document.getElementById('doc-parse-btn').addEventListener('click', () => {
  runSecretaryCommand('parse', 'Find key liability clauses');
});

document.getElementById('currency-calc-btn').addEventListener('click', () => {
  runSecretaryCommand('calculate', 'USD/EUR');
});

document.getElementById('whiteboard-btn').addEventListener('click', () => {
  appendChat('Opening shared whiteboard...', 'System');
});

// Periodic compliance monitoring (every 30 seconds)
setInterval(runComplianceCheck, 30000);
