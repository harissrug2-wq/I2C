function asScalar(value) {
  if (value == null) return null;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'object' && 'value' in value) return value.value;
  return value;
}

export function buildEffectiveThresholds(baseThresholds = {}, overrides = []) {
  const next = { ...baseThresholds };

  for (const override of overrides || []) {
    if (!override || override.suppressed) continue;
    if (override.entity_id != null) continue;
    if (!override.threshold_key) continue;

    const value = asScalar(override.threshold_value);
    if (value == null) continue;

    const numeric = Number(value);
    next[override.threshold_key] = Number.isFinite(numeric) ? numeric : value;
  }

  return next;
}

export function isAdvisorySuppressed(advisory, overrides = []) {
  if (!advisory?.id) return false;

  return (overrides || []).some(override => {
    if (!override?.suppressed) return false;
    if (String(override.rule_id || '') !== String(advisory.id)) return false;

    const scopedEntity = override.entity_id == null ? null : String(override.entity_id);
    if (scopedEntity == null || scopedEntity === '') return true;

    return String(advisory.entityId ?? '') === scopedEntity;
  });
}

export function applyRuleOverrides(advisories = [], overrides = []) {
  return (advisories || []).filter(advisory => !isAdvisorySuppressed(advisory, overrides));
}

export function normalizeRuleOverride(input = {}) {
  return {
    rule_id: String(input.rule_id || '').trim(),
    entity_type: input.entity_type ? String(input.entity_type).trim() : null,
    entity_id: input.entity_id ? String(input.entity_id).trim() : null,
    threshold_key: input.threshold_key ? String(input.threshold_key).trim() : null,
    threshold_value: input.threshold_value ?? null,
    suppressed: Boolean(input.suppressed),
    override_reason: String(input.override_reason || '').trim(),
  };
}
