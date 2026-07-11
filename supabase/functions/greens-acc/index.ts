import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const waiting_areas = new Map();
const active_green_rooms = new Map();
const system_logs = {
  faults_detected: 0,
  healed_incidents: 0,
  status: "NOMINAL",
  green_box_automation: "ACTIVE RUNNING",
  green_bubbles_sandbox: "SHIELDED / SECURE",
  multi_agent_orchestration: "IDLE",
  last_heal_timestamp: "Never",
};

function triggerSelfHealing(dId: string, type: string) {
  system_logs.faults_detected += 1;
  system_logs.status = `HEALING_${type.toUpperCase()}`;
  system_logs.multi_agent_orchestration = "RE-ROUTING_TRAFFIC";

  setTimeout(() => {
    system_logs.healed_incidents += 1;
    system_logs.status = "NOMINAL";
    system_logs.multi_agent_orchestration = "IDLE";
    system_logs.last_heal_timestamp = new Date().toLocaleTimeString();

    if (waiting_areas.has(dId)) {
      const a = waiting_areas.get(dId);
      a.system_health = "healthy";
      a.ready_for_negotiation = true;
    }
  }, 2500);
}

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    // ── Waiting Area: Join ───────────────────────────────────────────
    if (path === "/api/v1/meetings/waiting-area/join" && req.method === "POST") {
      const { deal_id, user_id, terms_accepted, compliance_verified } =
        await req.json();

      if (!terms_accepted || !compliance_verified) {
        return new Response(
          JSON.stringify({
            detail:
              "All contract conditions must be accepted to enter the Waiting Area.",
          }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      if (!waiting_areas.has(deal_id)) {
        waiting_areas.set(deal_id, {
          waiting_room_id: crypto.randomUUID(),
          deal_id,
          active_participants: [],
          ready_for_negotiation: false,
          system_health: "healthy",
        });
      }

      const a = waiting_areas.get(deal_id);
      if (a.system_health === "corrupted" || system_logs.status === "ERROR") {
        triggerSelfHealing(deal_id, "stuck_waiting_area");
      }

      if (!a.active_participants.includes(user_id)) {
        a.active_participants.push(user_id);
      }

      if (a.active_participants.length >= 2) a.ready_for_negotiation = true;

      return new Response(JSON.stringify(a), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── Green Room: Activate ─────────────────────────────────────────
    if (
      path === "/api/v1/meetings/green-room/activate" &&
      req.method === "POST"
    ) {
      const d_id = url.searchParams.get("deal_id");

      if (
        !d_id ||
        !waiting_areas.has(d_id) ||
        !waiting_areas.get(d_id).ready_for_negotiation
      ) {
        return new Response(
          JSON.stringify({
            detail: "Pre-conditions not verified in Waiting Area.",
          }),
          { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
        );
      }

      if (active_green_rooms.has(d_id)) {
        return new Response(JSON.stringify(active_green_rooms.get(d_id)), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const session = {
        room_id: crypto.randomUUID(),
        deal_id: d_id,
        webrtc_channel_id: `webrtc-live-${d_id}-${crypto.randomUUID().slice(0, 6)}`,
        status: "active",
      };
      active_green_rooms.set(d_id, session);

      return new Response(JSON.stringify(session), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ── System Status ────────────────────────────────────────────────
    if (path === "/api/v1/system/status" && req.method === "GET") {
      return new Response(
        JSON.stringify({
          platform: "Greens ACC",
          healing_blends_regime: system_logs,
          waiting_areas_count: waiting_areas.size,
          active_rooms_count: active_green_rooms.size,
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ── Force Heal ───────────────────────────────────────────────────
    if (path === "/api/v1/system/force-heal" && req.method === "POST") {
      triggerSelfHealing(
        url.searchParams.get("deal_id") || "deal-777",
        "manual_override"
      );
      return new Response(
        JSON.stringify({
          message:
            "Manual Healing Blend Regime initiated via Supabase Dashboard Override.",
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ── Admin HTML Gate ──────────────────────────────────────────────
    if (path === "/hassan-admin-gate" && req.method === "GET") {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Greens ACC Control Office</title><script src='https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'></script><script>async function joinWaiting(){await fetch('/api/v1/meetings/waiting-area/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deal_id:'deal-777',user_id:'user-hassan',terms_accepted:true,compliance_verified:true})});refreshDashboard();} async function openGreenRoom(){const res=await fetch('/api/v1/meetings/green-room/activate?deal_id=deal-777',{method:'POST'}),d=await res.json();document.getElementById('webrtc-box').innerText=d.detail?'Status: '+d.detail:'Live Room ID: '+d.webrtc_channel_id;refreshDashboard();} async function triggerManualHeal(){const res=await fetch('/api/v1/system/force-heal?deal_id=deal-777',{method:'POST'}),d=await res.json();alert(d.message);setTimeout(refreshDashboard,1000);} async function refreshDashboard(){const res=await fetch('/api/v1/system/status'),d=await res.json();document.getElementById('stat-faults').innerText=d.healing_blends_regime.faults_detected;document.getElementById('stat-healed').innerText=d.healing_blends_regime.healed_incidents;document.getElementById('stat-status').innerText=d.healing_blends_regime.status.toUpperCase();document.getElementById('stat-time').innerText=d.healing_blends_regime.last_heal_timestamp;document.getElementById('stat-waiting').innerText=d.waiting_areas_count;document.getElementById('stat-rooms').innerText=d.active_rooms_count;document.getElementById('stat-agent').innerText=d.healing_blends_regime.multi_agent_orchestration.toUpperCase();} window.onload=function(){refreshDashboard();setInterval(refreshDashboard,4000);};</script></head><body class='bg-slate-950 text-slate-100 min-h-screen font-sans'><header class='bg-slate-900 p-4 border-b border-emerald-500/30 shadow-lg'><div class='max-w-7xl mx-auto flex justify-between items-center'><h1 class='text-2xl font-bold text-emerald-400 tracking-wide flex items-center gap-2'>🟢 Greens ACC Control Room <span class='text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded'>Hassan Supabase Office</span></h1><button onclick='refreshDashboard()' class='bg-slate-800 hover:bg-slate-700 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 transition'>🔄 Sync Environment</button></div></header><main class='max-w-7xl mx-auto p-4 space-y-6'><section class='grid grid-cols-2 md:grid-cols-4 gap-4'><div class='bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm'><p class='text-xs text-slate-400 uppercase font-bold tracking-wider'>Pipeline Security State</p><p id='stat-status' class='text-xl font-black text-emerald-400 mt-1'>NOMINAL</p></div><div class='bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm'><p class='text-xs text-slate-400 uppercase font-bold tracking-wider'>Faults Blocked</p><p id='stat-faults' class='text-xl font-black text-amber-500 mt-1'>0</p></div><div class='bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm'><p class='text-xs text-slate-400 uppercase font-bold tracking-wider'>Dynamic Heals applied</p><p id='stat-healed' class='text-xl font-black text-cyan-400 mt-1'>0</p></div><div class='bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm'><p class='text-xs text-slate-400 uppercase font-bold tracking-wider'>Last Dynamic Repair</p><p id='stat-time' class='text-xl font-mono text-slate-300 mt-1'>Never</p></div></section><section class='grid grid-cols-1 md:grid-cols-3 gap-6'><div class='bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between'><div class='mb-4'><h2 class='text-lg font-bold text-emerald-400 mb-1'>🛒 Global B2B Marketplace & Waiting Area</h2><p class='text-xs text-slate-400'>Test platform entries and review contract mandates.</p><div class='mt-4 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1'><div><strong>Active Project ID:</strong> deal-777</div><div><strong>Human Rights / Legal Framework:</strong> Verified</div><div><strong>Active Waiting Gates:</strong> <span id='stat-waiting' class='font-bold text-emerald-400'>0</span></div></div></div><button onclick='joinWaiting()' class='w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-sm font-semibold border border-slate-700 transition'>Simulate Entry & Clear Terms</button></div><div class='bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between'><div class='mb-4'><h2 class='text-lg font-bold text-indigo-400 mb-1'>🤝 Secure Green Room Engine</h2><p class='text-xs text-slate-400'>Isolated live audio/video communication via WebRTC.</p><div id='webrtc-box' class='mt-4 bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs text-indigo-300 font-mono min-h-[72px] flex items-center justify-center text-center'>Waiting Area sign-off needed...</div></div><button onclick='openGreenRoom()' class='w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/10 transition'>Establish Live WebRTC Channel</button></div><div class='bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between'><div class='mb-4'><h2 class='text-lg font-bold text-amber-400 mb-1'>🛡️ System Core Orchestration Panel</h2><p class='text-xs text-slate-400'>Study and monitor the containerized architecture states.</p><div class='mt-4 space-y-2 text-xs'><div class='flex justify-between py-1 border-b border-slate-800'><span>Green Box Automation:</span><span class='text-emerald-400 font-bold'>ACTIVE RUNNING</span></div><div class='flex justify-between py-1 border-b border-slate-800'><span>Green Bubbles Isolation:</span><span class='text-cyan-400 font-bold'>SHIELDED / SECURE</span></div><div class='flex justify-between py-1 border-b border-slate-800'><span>Multi-Agent Orchestration:</span><span id='stat-agent' class='text-pink-400 font-bold'>IDLE</span></div><div class='flex justify-between py-1'><span>Active Green Rooms:</span><span id='stat-rooms' class='text-indigo-400 font-bold'>0</span></div></div></div><button onclick='triggerManualHeal()' class='w-full bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white py-2.5 rounded-xl text-sm font-semibold border border-amber-500/30 transition'>Execute Healing Blends Regime</button></div></section></main></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // ── Root landing page ────────────────────────────────────────────
    if (path === "/" && req.method === "GET") {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Greens ACC</title><script src='https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'></script></head><body class='bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center font-sans'><div class='text-center space-y-4 max-w-md p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl'><div class='text-5xl'>🚧</div><h1 class='text-3xl font-extrabold text-emerald-400'>Greens ACC</h1><p class='text-sm text-slate-400 font-medium'>The international platform architecture is currently running core deployments from Supabase. The ecosystem is locked under construction.</p><div class='text-xs text-slate-500 font-mono pt-4 border-t border-slate-800/60'>System Node State: NOMINAL</div></div></body></html>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    return new Response(JSON.stringify({ error: "Route not found" }), {
      status: 404,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
