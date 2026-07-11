import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const waiting_areas = new Map();
const active_green_rooms = new Map();
const system_logs = {
  faults_detected: 0,
  healed_incidents: 0,
  status: "NOMINAL",
  green_box_automation: "ACTIVE",
  green_bubbles_sandbox: "SHIELDED",
  multi_agent_orchestration: "IDLE",
  last_heal_timestamp: "Never",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (path === "/api/system/status" && req.method === "GET") {
    return new Response(
      JSON.stringify({
        healing_blends_regime: system_logs,
        waiting_areas_count: waiting_areas.size,
        active_rooms_count: active_green_rooms.size,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  if (path === "/api/system/force-heal" && req.method === "POST") {
    system_logs.faults_detected += 1;
    system_logs.status = "HEALING_ACTIVE";

    setTimeout(() => {
      system_logs.healed_incidents += 1;
      system_logs.status = "NOMINAL";
      system_logs.last_heal_timestamp = new Date().toLocaleTimeString();
    }, 2000);

    return new Response(
      JSON.stringify({ message: "Healing Blends Regime executed successfully." }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ error: "Not Found" }),
    { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
  );
});
