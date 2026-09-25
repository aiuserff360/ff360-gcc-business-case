// Local persistence of scenarios plus import / export helpers.
import { createDefaultModel, resizeModel, defaultBenchmarks } from './defaults.js';

const KEY = 'ff360-gcc-business-case-v2';
const SESSION_KEY = 'ff360-session';

export const newId = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

// Merge a stored model onto the default so newly added fields always exist, then fit arrays to the horizon.
export function normalizeModel(stored) {
  const base = createDefaultModel();
  if (!stored || typeof stored !== 'object') return base;
  const merged = { ...base };
  Object.keys(base).forEach((section) => {
    const s = stored[section];
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      merged[section] = { ...base[section], ...s };
      // Keep catalogue rows aligned by id/key where the model stores arrays of rows.
      ['bands', 'benefits', 'items', 'hiring', 'operating', 'center'].forEach((k) => {
        if (Array.isArray(base[section][k]) && Array.isArray(s[k])) {
          merged[section][k] = base[section][k].map((row, i) => ({ ...row, ...(s[k].find((x) => x.id && x.id === row.id) || s[k][i] || {}) }));
        }
      });
    }
  });
  // A case with no reference values yet gets the researched industry averages.
  const hasBench = merged.benchmarks && Object.values(merged.benchmarks).some((v) => v !== null && v !== undefined && v !== '');
  if (!hasBench) merged.benchmarks = defaultBenchmarks(merged.settings.currency, merged);
  return resizeModel(merged);
}

export function createScenario(name, model, extra = {}) {
  return { id: newId(), name, model: structuredClone(model), updatedAt: new Date().toISOString(), ...extra };
}

export function loadWorkspace() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.scenarios?.length) {
        const scenarios = parsed.scenarios.map((s) => ({ ...s, model: normalizeModel(s.model) }));
        const activeId = scenarios.some((s) => s.id === parsed.activeId) ? parsed.activeId : scenarios[0].id;
        return { scenarios, activeId };
      }
    }
  } catch { /* fresh workspace */ }
  const base = createScenario('Base case', createDefaultModel(), { locked: true });
  return { scenarios: [base], activeId: base.id };
}

export function saveWorkspace(workspace) {
  try { localStorage.setItem(KEY, JSON.stringify(workspace)); return true; } catch { return false; }
}

export const loadSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } };
export const saveSession = (s) => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ } };
export const clearSession = () => { try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ } };

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const slug = (s) => (s || 'scenario').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function exportScenarioJson(scenario) {
  const payload = { app: 'ff360-gcc-business-case', version: 2, exportedAt: new Date().toISOString(), scenario: { name: scenario.name, model: scenario.model } };
  download(`${slug(scenario.model.settings.gccName || scenario.name)}-assumptions.json`, JSON.stringify(payload, null, 2), 'application/json');
}

export function exportResultsCsv(scenario, results) {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const years = results.years.map((y) => `${y.label} ${y.year}`);
  const r = (v) => Math.round(v);
  const lines = [];
  lines.push([q('Company'), q(scenario.model.settings.companyName), q('GCC'), q(scenario.model.settings.gccName), q('Scenario'), q(scenario.name), q('Currency'), q(scenario.model.settings.currency)].join(','));
  lines.push('');
  lines.push(['Headcount', ...years].map(q).join(','));
  lines.push(['Exit headcount', ...results.headcount.exit].join(','));
  lines.push(['Average headcount', ...results.headcount.average.map((v) => v.toFixed(1))].join(','));
  lines.push(['New hires', ...results.headcount.hires.map((v) => v.toFixed(1))].join(','));
  lines.push('');
  lines.push(['Cost category', ...years, 'Total'].map(q).join(','));
  results.categories.forEach((c) => lines.push([q(c.name), ...c.values.map(r), r(c.total)].join(',')));
  lines.push([q('Total cost'), ...results.totals.byYear.map(r), r(results.totals.fiveYear)].join(','));
  lines.push([q('Cost per FTE'), ...results.totals.costPerFte.map(r), r(results.totals.avgCostPerFte)].join(','));
  lines.push('');
  lines.push(['Cash flow', ...years].map(q).join(','));
  lines.push(['Operating', ...results.cashflow.operating.map(r)].join(','));
  lines.push(['One-time', ...results.cashflow.oneTime.map(r)].join(','));
  lines.push(['Security deposits', ...results.cashflow.deposits.map(r)].join(','));
  lines.push(['Total cash out', ...results.cashflow.totalOut.map(r)].join(','));
  lines.push(['Cumulative', ...results.cashflow.cumulative.map(r)].join(','));
  download(`${slug(scenario.model.settings.gccName || scenario.name)}-results.csv`, lines.join('\n'), 'text/csv');
}

export function readScenarioFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const model = normalizeModel(parsed?.scenario?.model ?? parsed?.model ?? parsed);
        resolve({ name: parsed?.scenario?.name || file.name.replace(/\.json$/i, ''), model });
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
