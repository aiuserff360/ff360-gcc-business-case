import { PageHeader, StepNav } from '../components/Shell.jsx';
import { Panel, Field, NumField, Callout } from '../components/ui.jsx';
import { Icon } from '../components/icons.jsx';
import { CURRENCIES, OBJECTIVES, MIN_HORIZON, MAX_HORIZON, BENCHMARK_LIBRARY, librarySources, defaultBenchmarks, benchmarkMoneyKeys, convertAmount, fxRate, FX } from '../model/defaults.js';
import { money } from '../model/format.js';

export function Setup({ model, results, update, mutate, nav, go, workspace, actions, setBench }) {
  const s = model.settings;
  const set = (key) => (e) => update(['settings', key], e.target.value);
  const benchCount = Object.values(model.benchmarks || {}).filter((v) => v !== null && v !== undefined && v !== '').length;
  const horizons = Array.from({ length: MAX_HORIZON - MIN_HORIZON + 1 }, (_, i) => MIN_HORIZON + i);
  const active = workspace.scenarios.find((x) => x.id === workspace.activeId);
  const moneyKeys = benchmarkMoneyKeys(model);

  return (
    <>
      <PageHeader step={1} eyebrow="Step 1 of 6 · Case setup" title="Set up the business case" description="Tell us who the case is for, what the center is meant to achieve, where it will be and how far ahead you want to model. Everything downstream uses these settings." currency={s.currency} />

      <Panel title="Company and objective" subtitle="Shown in the header, summaries and exports.">
        <div className="form-grid">
          <Field label="Company name"><input value={s.companyName} onChange={set('companyName')} placeholder="e.g. Acme Industries" /></Field>
          <Field label="GCC / center name"><input value={s.gccName} onChange={set('gccName')} placeholder="e.g. Acme India Capability Center" /></Field>
          <Field label="Primary objective">
            <select value={s.objective} onChange={set('objective')}>
              <option value="">Select an objective</option>
              {OBJECTIVES.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="What are you trying to do, and what is the plan?" wide hint="Scope, functions to be moved or built, phasing, and any constraints. This appears on the executive summary.">
            <textarea value={s.plan} onChange={set('plan')} placeholder="e.g. Establish an engineering and shared-services center to support global product teams; start with a 40-person pilot in year 1 and scale to 300 by year 4, moving finance operations in year 2…" />
          </Field>
        </div>
      </Panel>

      <Panel title="Location, currency and horizon" subtitle="All amounts are modelled in constant currency. The currency sets the symbol on every input and output.">
        <div className="form-grid">
          <Field label="Country"><input value={s.country} onChange={set('country')} placeholder="e.g. India" /></Field>
          <Field label="Primary city"><input value={s.city} onChange={set('city')} placeholder="e.g. Bengaluru" /></Field>
          <Field label="Currency" hint={s.currency === 'USD' ? `Changing the currency converts every amount and industry average at ECB reference rates (${FX.asOf}).` : `1 USD = ${fxRate('USD', s.currency).toLocaleString('en-US', { maximumFractionDigits: 4 })} ${s.currency} · ECB reference rates, ${FX.asOf}. All amounts and averages were converted at this rate.`}>
            <select value={s.currency} onChange={set('currency')}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.name} ({c.symbol.trim()})</option>)}
            </select>
          </Field>
          <Field label="Business case horizon">
            <select value={results.N} onChange={(e) => update(['settings', 'horizonYears'], Number(e.target.value))}>
              {horizons.map((n) => <option key={n} value={n}>{n} years</option>)}
            </select>
          </Field>
          <Field label="First model year"><input type="number" min="2020" max="2100" value={s.startYear} onChange={(e) => update(['settings', 'startYear'], Number(e.target.value))} /></Field>
          <Field label="Attrition backfill hiring" hint="% of opening headcount replaced each year. Adds hiring costs and devices without changing the headcount plan.">
            <NumField value={s.attritionPct} onChange={(v) => update(['settings', 'attritionPct'], v)} suffix="%" size="wide" placeholder="0" />
          </Field>
        </div>
      </Panel>

      <Panel title="Industry averages" subtitle="Every input table shows an industry-average column next to your input. The researched India GCC set is loaded by default; edit any value directly in the tables, reload the set, or clear it to use your own references.">
        <div className="bench-summary">
          <span className="pill">{benchCount} reference values loaded</span>
          {Object.entries(BENCHMARK_LIBRARY).map(([key, lib]) => (
            <button type="button" key={key} className="btn sm" onClick={() => mutate((d) => { d.benchmarks = { ...d.benchmarks, ...defaultBenchmarks(d.settings.currency, d) }; })}><Icon name="reset" size={14} />Reload: {lib.label}</button>
          ))}
          <button type="button" className="btn sm" onClick={() => mutate((d) => { d.benchmarks = {}; })} disabled={benchCount === 0}><Icon name="trash" size={14} />Clear all reference values</button>
        </div>
        {Object.entries(BENCHMARK_LIBRARY).map(([key, lib]) => (
          <details className="sources" key={key}>
            <summary>Basis and sources for “{lib.label}” · researched in {lib.currency} at ₹{lib.fx} per USD · shown in {s.currency}{s.currency !== lib.currency ? ` at 1 ${lib.currency} = ${fxRate(lib.currency, s.currency).toLocaleString('en-US', { maximumFractionDigits: 4 })} ${s.currency} (ECB, ${FX.asOf})` : ''}</summary>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Input</th><th className="num">Reference value</th><th>Basis</th><th>Source</th></tr></thead>
                <tbody>
                  {Object.entries(lib.entries).map(([k, e]) => (
                    <tr key={k}>
                      <td className="muted" style={{ fontSize: 12 }}>{k}</td>
                      <td className="num">{moneyKeys.has(k) ? money(convertAmount(e.value, lib.currency, s.currency), s.currency, { decimals: convertAmount(e.value, lib.currency, s.currency) < 100 && !Number.isInteger(convertAmount(e.value, lib.currency, s.currency)) ? 2 : 0 }) : k.endsWith('Pct') || k.includes('escalation') || k.endsWith('.eligibility') || k.includes('benefits.epf') || k.includes('benefits.gratuity') || k.includes('basicPct') || k.includes('seatsPct') || k.includes('attrition') ? `${e.value}%` : e.value}</td>
                      <td style={{ fontSize: 12.5 }}>{e.basis}</td>
                      <td style={{ fontSize: 12.5 }}>{e.source.url ? <a href={e.source.url} target="_blank" rel="noreferrer">{e.source.name}</a> : <span className="muted">{e.source.name}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>Sources consulted: {librarySources(lib).map((src, i) => <span key={src.name}>{i > 0 && ' · '}{src.url ? <a href={src.url} target="_blank" rel="noreferrer">{src.name}</a> : src.name}</span>)}</p>
          </details>
        ))}
        <Callout icon="info" title="How to use these.">Loading fills only the industry-average columns. Your inputs stay empty until you type them or use “Fill empty inputs from industry average” on a page. Values marked as planning assumptions had no public benchmark and should be confirmed with vendor or client data.</Callout>
      </Panel>

      <Panel title="Workspace" subtitle="Scenarios are saved in this browser. Export JSON to move a case between devices.">
        <div className="inline-actions">
          <button type="button" className="btn" onClick={actions.exportJson}><Icon name="export" size={16} />Export “{active?.name}” as JSON</button>
          <button type="button" className="btn" onClick={actions.resetScenario}><Icon name="reset" size={16} />Clear all inputs in “{active?.name}”</button>
          <button type="button" className="btn danger" onClick={actions.clearWorkspace}><Icon name="trash" size={16} />Remove every scenario</button>
        </div>
      </Panel>

      <StepNav nav={nav} go={go} />
    </>
  );
}
