/**
 * currencyFormatter.js
 * Formats numbers as currency with:
 *  - Latin/English numerals (1,2,3) — never Eastern Arabic (١,٢,٣)
 *  - Israeli Shekel symbol (₪)
 *  - Comma thousands separator
 *  - 2 decimal places
 *
 * Output examples:  "₪1,500.00"  |  "₪2,350,000.00"  |  "₪0.00"
 */

const ILS_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'ILS',
  currencyDisplay: 'narrowSymbol', // renders ₪ not "ILS"
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * formatCurrency(value)
 * @param {number|string|null|undefined} value
 * @returns {string}  e.g. "₪1,500.00"
 */
export function formatCurrency(value) {
  const num = Number(value);
  if (isNaN(num)) return '₪0.00';
  return ILS_FORMATTER.format(num);
}

/**
 * formatCurrencyCompact(value)
 * Abbreviated form for dashboard cards.
 * @returns {string}  e.g. "₪1.5M"  |  "₪250K"  |  "₪850"
 */
export function formatCurrencyCompact(value) {
  const num = Number(value);
  if (isNaN(num)) return '₪0';
  if (Math.abs(num) >= 1_000_000) {
    return `₪${(num / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1_000) {
    return `₪${(num / 1_000).toFixed(1)}K`;
  }
  return `₪${num.toFixed(0)}`;
}

/**
 * formatNumber(value)
 * Plain number formatting with Latin numerals and comma separators.
 * @returns {string}  e.g. "1,500"
 */
export function formatNumber(value) {
  const num = Number(value);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}
