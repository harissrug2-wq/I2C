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


export async function logAuditEvent({
  userId,
  workspaceId,
  eventType,
  ruleId = null,
  entityType = null,
  entityId = null,
  fieldName = null,
  oldValue = null,
  newValue = null,
  reason = '',
  metadata = {},
}) {
  if (!supabase || !userId || !workspaceId) return;

  const { error } = await supabase.from('audit_log').insert({
    workspace_id: workspaceId,
    owner_id: userId,
    actor_user_id: userId,
    event_type: eventType,
    rule_id: ruleId,
    entity_type: entityType,
    entity_id: entityId,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
    reason,
    metadata,
  });

  if (error) throw error;
}

export async function persistPredictionLogs({ workspaceId, rows = [] }) {
  if (!supabase || !workspaceId || !rows.length) return { inserted: 0 };

  const fingerprints = [...new Set(rows.map(row => row.fingerprint).filter(Boolean))];
  if (!fingerprints.length) return { inserted: 0 };

  const { data: existing, error: lookupError } = await supabase
    .from('predictions_log')
    .select('fingerprint')
    .eq('workspace_id', workspaceId)
    .in('fingerprint', fingerprints);

  if (lookupError) throw lookupError;

  const seen = new Set((existing || []).map(row => row.fingerprint));
  const fresh = rows.filter(row => row.fingerprint && !seen.has(row.fingerprint));
  if (!fresh.length) return { inserted: 0 };

  const { error } = await supabase.from('predictions_log').insert(fresh);
  if (error && error.code !== '23505') throw error;

  return { inserted: error ? 0 : fresh.length };
}

export async function upsertMetricSnapshots({ snapshots = [] }) {
  if (!supabase || !snapshots.length) return;

  const { error } = await supabase
    .from('metric_snapshots')
    .upsert(snapshots, { onConflict: 'workspace_id,snapshot_type,snapshot_date' });

  if (error) throw error;
}


export async function loadRuleOverrides({ userId, workspaceId }) {
  if (!supabase || !userId || !workspaceId) return [];

  const { data, error } = await supabase
    .from('rule_overrides')
    .select('id,rule_id,entity_type,entity_id,threshold_key,threshold_value,suppressed,override_reason,created_at,updated_at')
    .eq('workspace_id', workspaceId)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function saveRuleOverride({ userId, workspaceId, override }) {
  if (!supabase || !userId || !workspaceId) throw new Error('Authenticated workspace is not available.');

  const payload = {
    workspace_id: workspaceId,
    owner_id: userId,
    rule_id: override.rule_id,
    entity_type: override.entity_type,
    entity_id: override.entity_id,
    threshold_key: override.threshold_key,
    threshold_value: override.threshold_value,
    suppressed: Boolean(override.suppressed),
    override_reason: override.override_reason || '',
    created_by: userId,
  };

  if (override.id) {
    const { data, error } = await supabase
      .from('rule_overrides')
      .update(payload)
      .eq('id', override.id)
      .eq('workspace_id', workspaceId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('rule_overrides')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRuleOverride({ userId, workspaceId, id }) {
  if (!supabase || !userId || !workspaceId || !id) return;

  const { error } = await supabase
    .from('rule_overrides')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .eq('owner_id', userId);

  if (error) throw error;
}
