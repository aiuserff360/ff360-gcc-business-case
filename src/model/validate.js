// Model integrity and plausibility checks. Pure; returns a list of { id, name, status, detail }.
// status: 'pass' | 'warn' | 'fail' | 'info'
import { BANDS, REAL_ESTATE_TYPES, TECHNOLOGY_FIELDS, fxRate, benchmarkEntries } from './defaults.js';
import { money, pct } from './format.js';

const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const sum = (a) => a.reduce((t, v) => t + (Number(v) || 0), 0);

export function validateModel(model, results) {
  const cur = model.settings.currency;
  const t = results.totals;
  const hc = results.headcount;
  const N = results.N; const L = results.L;
  const m = (v) => money(v, cur, { compact: true });
  const checks = [];
  const add = (id, name, status, detail) => checks.push({ id, name, status, detail });
  const empty = !hc.entered || t.fiveYear === 0;

  // ---- Arithmetic reconciliation (always run) ----
  const catSum = results.Y.map((y) => results.categories.reduce((s, c) => s + c.values[y], 0));
  const recon = results.Y.every((y) => Math.abs(catSum[y] - t.byYear[y]) < 1);
  add('reconcile', 'Category totals reconcile to the annual total', recon ? 'pass' : 'fail', recon ? `Six categories sum to ${m(t.fiveYear)} across ${N} years.` : 'Category totals do not add up to the annual total.');
  const split = results.Y.every((y) => Math.abs(t.operating[y] + t.oneTime[y] - t.byYear[y]) < 1);
  add('split', 'Operating + one-time = total', split ? 'pass' : 'fail', split ? `One-time items: ${m(sum(t.oneTime))} of ${m(t.fiveYear)}.` : 'Operating and one-time components do not reconcile.');
  const cash = Math.abs(results.cashflow.cumulative[L] - sum(results.cashflow.totalOut)) < 1;
  add('cash', 'Cumulative cash out reconciles', cash ? 'pass' : 'fail', `${m(results.cashflow.cumulative[L])} including ${m(results.cashflow.depositTotal)} refundable deposits.`);
  const perFteOk = results.Y.every((y) => hc.average[y] === 0 || Math.abs(t.costPerFte[y] * hc.average[y] - t.byYear[y]) < 1);
  add('perFte', 'Cost per FTE × average headcount = annual total', perFteOk ? 'pass' : 'fail', perFteOk ? 'Per-FTE figures are consistent with totals.' : 'Per-FTE figures do not reconcile.');

  if (empty) {
    add('inputs', 'Inputs', 'info', 'Enter the headcount plan and cost inputs to run plausibility checks.');
    return checks;
  }

  // ---- Structural checks ----
  const mixOk = hc.mixValid.every(Boolean);
  add('mix', 'Experience mix totals 100% every year', mixOk ? 'pass' : 'fail', mixOk ? 'All years valid.' : `Years off 100%: ${results.years.filter((y) => !hc.mixValid[y.index]).map((y) => y.label).join(', ')}.`);
  const shrink = hc.netAdd.some((v) => v < 0);
  add('ramp', 'Headcount ramp does not shrink', shrink ? 'warn' : 'pass', shrink ? 'Exit headcount falls in at least one year; hiring costs use zero hires for those years.' : `Grows from ${hc.exit[0]} to ${hc.exit[L]}.`);
  const bases = model.compensation.bands.map((b) => Number(b.base));
  const monotonic = bases.every((v, i) => i === 0 || !has(v) || !has(bases[i - 1]) || v >= bases[i - 1]);
  add('bands', 'Base salary rises with experience band', monotonic ? 'pass' : 'warn', monotonic ? BANDS.map((b, i) => `${b.short}: ${money(bases[i] || 0, cur, { compact: true })}`).join(' · ') : 'A junior band is paid more than a senior band. Check the compensation table.');
  const benefitLoad = (() => { const p = results.compensation.perBand.map((band) => band[0]); const base = sum(p.map((x) => x.base)); const ben = sum(p.map((x) => x.benefits)); return base ? (ben / base) * 100 : 0; })();
  add('benefits', 'Benefits load on base salary is plausible', benefitLoad >= 8 && benefitLoad <= 40 ? 'pass' : 'warn', `${pct(benefitLoad, 1)} of base (statutory plus per-employee benefits). Indian GCCs typically run 10–25% (statutory contributions on basic plus insurance, learning and programs).`);
  const escal = [model.compensation.escalation, model.otherPeople.escalation, model.corporate.escalation, model.technology.escalation, model.realEstate.type ? model.realEstate[model.realEstate.type].escalation : null].filter(has).map(Number);
  add('escalation', 'Escalation rates within 0–20%', escal.every((v) => v >= 0 && v <= 20) ? 'pass' : 'warn', escal.length ? `Rates entered: ${escal.map((v) => `${v}%`).join(', ')}.` : 'No escalation entered (constant-cost model).');

  // ---- Plausibility against market ranges (USD ranges converted to the case currency) ----
  const usd = (v) => v * fxRate('USD', cur);
  const cpf = t.finalCostPerFte;
  add('costPerFte', `Year ${N} all-in cost per FTE within India GCC range`, cpf >= usd(18000) && cpf <= usd(90000) ? 'pass' : 'warn', `${money(cpf, cur)} per FTE. India GCC benchmarks: ≈ ${m(usd(25000))} average across all roles (EY, ₹23.9 lakh), ${m(usd(35000))}–${m(usd(60000))} for engineering-heavy centers.`);
  const share = (key) => (t.fiveYear ? (results.categories.find((c) => c.key === key).total / t.fiveYear) * 100 : 0);
  const people = share('compensation') + share('otherPeople');
  add('peopleShare', 'People costs are the dominant share', people >= 55 && people <= 88 ? 'pass' : 'warn', `${pct(people, 1)} of total. Typical GCC range 65–85%.`);
  const re = share('realEstate');
  add('reShare', 'Real estate share is plausible', re >= 2 && re <= 18 ? 'pass' : 'warn', `${pct(re, 1)} of total (${results.realEstate.typeName}). Typical range 5–12%.`);
  const tech = share('technology');
  add('techShare', 'Technology share is plausible', tech >= 2 && tech <= 15 ? 'pass' : 'warn', `${pct(tech, 1)} of total. Typical range 4–10%.`);
  const est = results.establishment.total;
  add('establishment', 'One-time establishment is proportionate', t.byYear[0] === 0 || est / t.byYear[0] <= 0.35 ? 'pass' : 'warn', `${m(est)} = ${pct(t.byYear[0] ? (est / t.byYear[0]) * 100 : 0, 0)} of Year 1 cost.`);
  const seatsPct = model.realEstate.type ? Number(model.realEstate[model.realEstate.type].seatsPct) : null;
  if (has(seatsPct)) add('seats', 'Seat ratio is realistic', seatsPct >= 50 && seatsPct <= 120 ? 'pass' : 'warn', `${seatsPct}% seats per employee → ${hc.seats[L]} seats for ${hc.exit[L]} people in Year ${N}.`);

  // ---- Inputs far from industry average ----
  const outliers = [];
  benchmarkEntries(model).forEach((e) => {
    const avg = model.benchmarks?.[e.key];
    let v = model;
    for (const k of e.path) v = v?.[k];
    if (!has(v) || !has(avg) || Number(avg) === 0) return;
    const r = Number(v) / Number(avg);
    if (r > 2 || r < 0.5) outliers.push(`${e.key} (${r > 1 ? `${(r).toFixed(1)}× avg` : `${Math.round(r * 100)}% of avg`})`);
  });
  add('outliers', 'Inputs stay within 0.5×–2× of industry average', outliers.length ? 'warn' : 'pass', outliers.length ? `${outliers.length} outlier${outliers.length > 1 ? 's' : ''}: ${outliers.slice(0, 4).join('; ')}${outliers.length > 4 ? '…' : ''}` : 'No input differs from its industry average by more than 2×.');

  // ---- Completeness ----
  const st = results.status;
  const incomplete = Object.entries(st).filter(([, v]) => v !== 'done').map(([k]) => k);
  add('complete', 'All input steps complete', incomplete.length ? 'info' : 'pass', incomplete.length ? `Not yet complete: ${incomplete.join(', ')}. Empty inputs count as zero.` : 'Every step is complete.');
  return checks;
}

export const summarizeChecks = (checks) => ({
  fail: checks.filter((c) => c.status === 'fail').length,
  warn: checks.filter((c) => c.status === 'warn').length,
  pass: checks.filter((c) => c.status === 'pass').length,
});

export { REAL_ESTATE_TYPES, TECHNOLOGY_FIELDS };
