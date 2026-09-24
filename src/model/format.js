import { CURRENCIES } from './defaults.js';

export const symbolFor = (code) => CURRENCIES.find((c) => c.code === code)?.symbol ?? '';

// Compact money: $1.04M / $159.8K / $950. Full: $159,800.
export function money(value, currency = 'USD', opts = {}) {
  const { compact = false, decimals } = opts;
  const v = Number(value) || 0;
  const sym = symbolFor(currency);
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  if (compact) {
    if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(abs >= 1e7 ? 1 : 2)}M`;
    if (abs >= 1e4) return `${sign}${sym}${(abs / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`;
    return `${sign}${sym}${Math.round(abs).toLocaleString('en-US')}`;
  }
  const d = decimals ?? 0;
  return `${sign}${sym}${abs.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

// Millions with one decimal, no symbol (for tables headed "USD million").
export const millions = (v, d = 2) => (Number(v) / 1e6).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export const int = (v) => Math.round(Number(v) || 0).toLocaleString('en-US');
export const pct = (v, d = 1) => `${(Number(v) || 0).toFixed(d)}%`;
export const signedPct = (v, d = 0) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Number(v) || 0).toFixed(d)}%`;
