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
});

// simple heartbeat to AI agent statuses (demo)
setInterval(() => {
  ai1Status.textContent = 'active'; ai2Status.textContent = 'active'; ai3Status.textContent = 'active';
}, 5000);
