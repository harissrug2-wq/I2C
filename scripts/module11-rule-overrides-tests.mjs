import assert from 'node:assert/strict';
import { applyRuleOverrides, buildEffectiveThresholds, isAdvisorySuppressed, normalizeRuleOverride } from '../src/domain/ruleOverrides.js';

const base = { current_ratio_min: 1.5, target_ccc: 45 };
const overrides = [
  {
    rule_id: 'WCM-010',
    threshold_key: 'current_ratio_min',
    threshold_value: 2.25,
    suppressed: false,
    entity_id: null,
  },
  {
    rule_id: 'COL-002',
    suppressed: true,
    entity_id: null,
  },
  {
    rule_id: 'INV-011',
    suppressed: true,
    entity_id: 'SKU-123',
  },
];

const effective = buildEffectiveThresholds(base, overrides);
assert.equal(effective.current_ratio_min, 2.25);
assert.equal(effective.target_ccc, 45);

const advisories = [
  { id: 'COL-002', entityId: 'CUST-1' },
  { id: 'INV-011', entityId: 'SKU-123' },
  { id: 'INV-011', entityId: 'SKU-999' },
  { id: 'WCM-010', entityId: null },
];

assert.equal(isAdvisorySuppressed(advisories[0], overrides), true);
assert.equal(isAdvisorySuppressed(advisories[1], overrides), true);
assert.equal(isAdvisorySuppressed(advisories[2], overrides), false);

assert.deepEqual(
  applyRuleOverrides(advisories, overrides).map(row => [row.id, row.entityId]),
  [
    ['INV-011', 'SKU-999'],
    ['WCM-010', null],
  ],
);

assert.deepEqual(
  normalizeRuleOverride({
    rule_id: '  AP-004 ',
    entity_type: '',
    entity_id: ' BILL-1 ',
    threshold_key: '',
    threshold_value: null,
    suppressed: 1,
    override_reason: '  approved exception  ',
  }),
  {
    rule_id: 'AP-004',
    entity_type: null,
    entity_id: 'BILL-1',
    threshold_key: null,
    threshold_value: null,
    suppressed: true,
    override_reason: 'approved exception',
  },
);

console.log('✓ Rule override + suppression foundation tests passed');
console.log(JSON.stringify({
  effectiveCurrentRatioMin: effective.current_ratio_min,
  remainingAdvisories: applyRuleOverrides(advisories, overrides).length,
}, null, 2));
