import { supabase } from '../supabaseClient';
import { AGENT_REGISTRY } from '../agents/agentRegistry';

export async function dispatchTask({ agentId, taskType, containerId, userId, payload }) {
  const agent = AGENT_REGISTRY.find((a) => a.id === agentId);
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);

  const { data: task, error } = await supabase
    .from('agent_tasks')
    .insert({
      agent_id: agentId,
      container_id: containerId,
      task_type: taskType,
      requested_by_user_id: userId,
      status: 'pending',
      input_payload: payload,
    })
    .select()
    .single();

  if (error) throw error;
  return task;
}

export async function getAgentTasks(containerId) {
  const { data, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('container_id', containerId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
