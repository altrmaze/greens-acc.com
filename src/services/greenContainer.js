import { supabase } from '../supabaseClient';

export async function fetchContainer(userId) {
  const { data, error } = await supabase
    .from('green_containers')
    .select('*')
    .eq('owner_user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchObjects(containerId) {
  const { data, error } = await supabase
    .from('green_container_objects')
    .select('*')
    .eq('container_id', containerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPermissions(containerId) {
  const { data, error } = await supabase
    .from('green_container_permissions')
    .select('*')
    .eq('container_id', containerId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchConsents(containerId) {
  const { data, error } = await supabase
    .from('green_container_consents')
    .select('*')
    .eq('container_id', containerId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAccessLog(containerId, limit = 50) {
  const { data, error } = await supabase
    .from('green_container_access_log')
    .select('*')
    .eq('container_id', containerId)
    .order('accessed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAutomationRules(containerId) {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('container_id', containerId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAgentTasks(containerId) {
  const { data, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('container_id', containerId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}
