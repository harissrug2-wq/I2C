import assert from 'node:assert/strict';
import { decimal, decimalMoney, decimalNumber, decimalPercentRatio, decimalSum } from '../src/domain/decimalMath.js';

assert.equal(decimal('0.1').plus('0.2').toString(), '0.3');
assert.equal(decimalSum(['0.1', '0.2', '0.3']).toString(), '0.6');
assert.equal(decimalMoney(decimal('6600').times('0.65').times('0.85')), 3646.5);
assert.equal(decimalMoney(decimal('9850').times('0.005').times('0.85')), 41.86);
assert.equal(decimalNumber(decimal('1').div('3'), 6), 0.333333);
assert.equal(decimalPercentRatio('25', '100', 6), 0.25);

const invoiceEcl = [
  decimal('9850').times('0.005').times('0.85'),
  decimal('9400').times('0.05').times('0.85'),
  decimal('6600').times('0.65').times('0.85'),
];
assert.equal(decimalMoney(decimalSum(invoiceEcl)), 4087.86);

console.log('✓ Exact-decimal financial math foundation tests passed');
console.log(JSON.stringify({
  exactPointOnePlusPointTwo: decimal('0.1').plus('0.2').toString(),
  referenceEcl: decimalMoney(decimalSum(invoiceEcl)),
}, null, 2));
