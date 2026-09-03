import { supabase } from '../lib/supabase';

export async function loadWorkspaceState(userId) {
  if (!supabase || !userId) throw new Error('Authenticated workspace is not available.');

  const { data, error } = await supabase
    .from('workspace_state')
    .select('workspace_id, data, thresholds, updated_at')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Your workspace has not been provisioned yet. Please sign out and sign in again.');
  return data;
}

export async function saveWorkspaceState({ userId, workspaceId, data, thresholds }) {
  if (!supabase || !userId || !workspaceId) throw new Error('Authenticated workspace is not available.');

  const { error } = await supabase
    .from('workspace_state')
    .update({
      data,
      thresholds,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('owner_id', userId);

  if (error) throw error;
}
