// Minimal Meeting Suite client
// Uses Supabase edge functions for room management and AI analysis

const functionHost = '/supabase/functions';

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
    // For demo, we will not wire a full signaling server. Instead we show local preview and enable chat/AI.
    appendChat('You joined the room. Local AV enabled.');
    // Notify AI agents of join event
    postAiEvent({ type: 'join', room: activeRoom.id, text: 'Participant joined the room.' });
  } catch (err) {
    appendChat('Failed to access media: ' + err.message);
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
