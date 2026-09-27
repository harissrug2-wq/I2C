import Decimal from 'decimal.js';

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});

export function decimal(value = 0) {
  if (value instanceof Decimal) return value;
  if (value === null || value === undefined || value === '') return new Decimal(0);
  return new Decimal(String(value));
}

export function decimalSum(values = []) {
  return (values || []).reduce((sum, value) => sum.plus(decimal(value)), new Decimal(0));
}

export function decimalNumber(value, decimalPlaces = null) {
  const d = decimal(value);
  if (decimalPlaces == null) return d.toNumber();
  return d.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toNumber();
}

export function decimalMoney(value) {
  return decimalNumber(value, 2);
}

export function decimalWholeMoney(value) {
  return decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function decimalPercentRatio(numerator, denominator, decimalPlaces = 6) {
  const den = decimal(denominator);
  if (den.isZero()) return 0;
  return decimalNumber(decimal(numerator).div(den), decimalPlaces);
}

export { Decimal };
