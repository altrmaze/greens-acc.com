import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const payload = await req.json();
    const behaviorScore = Number(payload?.behavior_score ?? 0);
    const payloadSizeMb = Number(payload?.payload_size_mb ?? 0);
    const signatureMatched = Boolean(payload?.signature_matched);
    const departmentId = payload?.department_id ?? null;
    const workspaceQueue = (payload?.workspace_queue || "global-security-telemetry").toString();

    let threatLevel = "YELLOW";
    let killSwitchActivated = false;
    let bubbleIsolated = false;
    let actionTaken = "Log recorded. Normal operations maintained.";

    if (behaviorScore >= 0.9 || (signatureMatched && behaviorScore > 0.75)) {
      threatLevel = "RED";
      killSwitchActivated = true;
      bubbleIsolated = true;
      actionTaken = "SYSTEM KILL SWITCH TRIGGERED. Hard isolation executed via Supabase Edge.";
    } else if (behaviorScore >= 0.7 || signatureMatched) {
      threatLevel = "ORANGE";
      bubbleIsolated = true;
      actionTaken = "Process quarantined inside General Bubble environment.";
    } else if (behaviorScore >= 0.4 || payloadSizeMb > 500) {
      threatLevel = "PURPLE";
      actionTaken = "Rate limiting applied via edge gateway. Deep behavioral tracking active.";
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.from("security_telemetry").insert([
      {
        event_id: payload?.event_id ?? crypto.randomUUID(),
        department_id: departmentId,
        workspace_queue: workspaceQueue,
        source_ip: payload?.source_ip ?? null,
        behavior_score: behaviorScore,
        signature_matched: signatureMatched,
        payload_size_mb: payloadSizeMb,
        threat_level: threatLevel,
        kill_switch_active: killSwitchActivated,
        bubble_isolated: bubbleIsolated,
        action_details: actionTaken,
      },
    ]);

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ threatLevel, killSwitchActivated, bubbleIsolated, actionTaken }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("security-telemetry failure", error);
    return new Response(JSON.stringify({ error: "Failed to process security telemetry event" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
