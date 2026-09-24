import { useMemo, useState } from 'react';
import { PageHeader } from '../components/Shell.jsx';
import { Panel, Kpi, Tabs, NumField, Callout } from '../components/ui.jsx';
import { Icon } from '../components/icons.jsx';
import { Tornado, Columns } from '../components/charts.jsx';
import { compute, computeSensitivity, SENSITIVITY_DRIVERS } from '../model/engine.js';
import { money, int, signedPct, pct } from '../model/format.js';

const TABS = [['scenarios', 'Scenario comparison'], ['analysis', 'Sensitivity analysis']];

export function Sensitivity({ model, results, page, go, currency, workspace, actions }) {
  return (
    <>
      <PageHeader icon="sliders" eyebrow="Output · Decide" title="Scenarios & sensitivity" description={`Compare saved scenarios side by side and test how sensitive the ${results.N}-year case is to the inputs that matter most.`} currency={currency} />
      <Tabs tabs={TABS} value={page || 'scenarios'} onChange={(k) => go('sensitivity', k)} />
      {page === 'analysis' ? <Analysis model={model} results={results} /> : <Scenarios model={model} results={results} workspace={workspace} actions={actions} />}
    </>
  );
}

function Scenarios({ model, results, workspace, actions }) {
  const cur = model.settings.currency;
  const N = results.N;
  const [selected, setSelected] = useState(() => workspace.scenarios.slice(0, 4).map((s) => s.id));
  const computed = useMemo(() => workspace.scenarios.map((s) => ({ scenario: s, results: compute(s.model) })), [workspace.scenarios]);
  const chosen = computed.filter((c) => selected.includes(c.scenario.id));
  const ref = chosen[0];
  const m = (v) => money(v, cur, { compact: true });
  const toggle = (id) => setSelected((cur0) => (cur0.includes(id) ? cur0.filter((x) => x !== id) : cur0.length < 4 ? [...cur0, id] : cur0));

  const metrics = [
    { name: 'Horizon', get: (r) => r.N, fmt: (v) => `${v} years`, noDelta: true },
    { name: 'Final-year headcount', get: (r) => r.totals.finalHeadcount, fmt: int },
    { name: 'Total cost over horizon', get: (r) => r.totals.fiveYear, fmt: m },
    { name: 'Final-year run-rate', get: (r) => r.totals.runRate, fmt: m },
    { name: 'Final-year cost per FTE', get: (r) => r.totals.finalCostPerFte, fmt: (v) => money(v, cur) },
    { name: 'Average cost per FTE', get: (r) => r.totals.avgCostPerFte, fmt: (v) => money(v, cur) },
    { name: 'Compensation', get: (r) => r.compensation.fiveYear, fmt: m },
    { name: 'Other people costs', get: (r) => r.otherPeople.fiveYear, fmt: m },
    { name: 'Real estate', get: (r) => r.realEstate.fiveYear, fmt: m },
    { name: 'Technology', get: (r) => r.technology.fiveYear, fmt: m },
    { name: 'Corporate + establishment', get: (r) => r.corporate.fiveYear + r.establishment.total, fmt: m },
    { name: 'Total cash out incl. deposits', get: (r) => r.cashflow.cumulative[r.L], fmt: m },
  ];

  return (
    <>
      <div className="grid grid-1-2">
        <Panel title="Scenarios" subtitle="Select up to four to compare. The first selected is the reference." actions={<button type="button" className="btn sm primary" onClick={actions.newScenario}><Icon name="plus" size={14} />New from current</button>}>
          <div className="scenario-list">
            {workspace.scenarios.map((s) => (
              <div className="scenario-row" key={s.id}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} aria-label={`Compare ${s.name}`} />
                <div className="sn">{s.name}{s.id === workspace.activeId && <span className="pill">Active</span>}{s.locked && <span className="pill neutral">Base</span>}<small>{new Date(s.updatedAt).toLocaleString()}</small></div>
                <div className="actions">
                  {s.id !== workspace.activeId && <button type="button" className="btn sm" onClick={() => actions.switchScenario(s.id)}>Open</button>}
                  <button type="button" className="btn sm" onClick={() => actions.duplicateScenario(s.id)} title="Duplicate"><Icon name="copy" size={14} /></button>
                  <button type="button" className="btn sm" onClick={() => actions.renameScenario(s.id)} title="Rename"><Icon name="edit" size={14} /></button>
                  {!s.locked && <button type="button" className="btn sm danger" onClick={() => actions.deleteScenario(s.id)} title="Delete"><Icon name="trash" size={14} /></button>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Total cost by scenario">
          {chosen.length >= 2 ? <Columns name="Total cost over horizon" data={chosen.map((c) => ({ label: c.scenario.name.length > 14 ? `${c.scenario.name.slice(0, 13)}…` : c.scenario.name, value: c.results.totals.fiveYear }))} format={m} height={260} /> : <div className="empty">Create a second scenario with “New from current”, change some inputs, then select both to compare.</div>}
        </Panel>
      </div>
      <Panel title="Scenario comparison" subtitle="Differences are shown against the reference scenario." tight>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Metric</th>{chosen.map((c, i) => <th key={c.scenario.id} className="num">{c.scenario.name}<small>{i === 0 ? 'Reference' : 'vs reference'}</small></th>)}</tr>
            </thead>
            <tbody>
              {metrics.map((mt) => (
                <tr key={mt.name}>
                  <td>{mt.name}</td>
                  {chosen.map((c, i) => {
                    const v = mt.get(c.results);
                    const base = ref ? mt.get(ref.results) : 0;
                    const d = i === 0 || mt.noDelta || !base ? null : ((v - base) / base) * 100;
                    return <td key={c.scenario.id} className="num"><b>{mt.fmt(v)}</b>{d !== null && <span className={`sub ${d > 0 ? 'bad' : d < 0 ? 'good' : 'muted'}`} style={{ display: 'block', fontSize: 11.5 }}>{signedPct(d, 1)}</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Callout icon="info" title="Tip.">Scenarios with different horizons are compared on their own totals; use the run-rate and per-FTE lines for a like-for-like view. {N}-year horizon in the active scenario.</Callout>
    </>
  );
}

function Analysis({ model, results }) {
  const cur = model.settings.currency;
  const N = results.N;
  const [flex, setFlex] = useState(() => Object.fromEntries(SENSITIVITY_DRIVERS.map((d) => [d.key, d.flex])));
  const drivers = SENSITIVITY_DRIVERS.map((d) => ({ ...d, flex: Number(flex[d.key]) || 0 }));
  const rows = useMemo(() => computeSensitivity(model, results, drivers).sort((a, b) => Math.abs(b.upFiveYear) - Math.abs(a.upFiveYear)), [model, results, JSON.stringify(flex)]);
  const m = (v) => `${v >= 0 ? '+' : '−'}${money(Math.abs(v), cur, { compact: true })}`;
  const top = rows[0];
  const empty = !results.totals.fiveYear;
  return (
    <>
      {empty && <Callout tone="warn" icon="alert" title="Nothing to flex yet.">Sensitivity needs a populated case. Complete the input steps first.</Callout>}
      <div className="kpis">
        <Kpi icon="coins" label={`Base case ${N}-year total`} value={money(results.totals.fiveYear, cur, { compact: true })} sub="Current inputs" />
        <Kpi icon="sliders" label="Most sensitive driver" value={top && !empty ? top.name : '—'} sub={top && !empty ? `${signedPct(top.upPct, 1)} at +${top.flex}%` : ''} />
        <Kpi icon="trend" label={`Widest swing (${N}-year)`} value={top && !empty ? money(top.upFiveYear - top.downFiveYear, cur, { compact: true }) : '—'} sub={top ? `from −${top.flex}% to +${top.flex}%` : ''} />
        <Kpi icon="user" label={`Year ${N} cost per FTE`} value={money(results.totals.finalCostPerFte, cur)} sub="Base case" />
      </div>
      <div className="grid grid-2-1">
        <Panel title={`Sensitivity of the ${N}-year total`} subtitle="Change in total cost when each driver is flexed up and down while everything else is held constant.">
          {empty ? <div className="empty">Enter inputs to see the tornado.</div> : <>
            <Tornado rows={rows.map((r) => ({ name: r.name, flex: r.flex, up: r.upFiveYear, down: r.downFiveYear }))} format={m} />
            <div className="legend"><span><i style={{ background: '#2a78d6' }} />Driver increased</span><span><i style={{ background: '#86b6ef' }} />Driver decreased</span></div>
          </>}
        </Panel>
        <Panel title="Flex range per driver" subtitle="Adjust the ± percentage applied to each driver." tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Driver</th><th>Flex ±</th></tr></thead>
              <tbody>
                {SENSITIVITY_DRIVERS.map((d) => <tr key={d.key}><td>{d.name}</td><td><NumField value={flex[d.key]} onChange={(v) => setFlex((f) => ({ ...f, [d.key]: v ?? 0 }))} suffix="%" size="narrow" decimals={0} /></td></tr>)}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="Impact table" tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Driver</th><th className="num">Flex</th><th className="num">Total (−)</th><th className="num">Total (+)</th><th className="num">Δ total (+)</th><th className="num">Δ run-rate (+)</th><th className="num">Impact</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>{r.name}</td>
                  <td className="num">±{r.flex}%</td>
                  <td className="num">{money(results.totals.fiveYear + r.downFiveYear, cur, { compact: true })}</td>
                  <td className="num">{money(results.totals.fiveYear + r.upFiveYear, cur, { compact: true })}</td>
                  <td className="num">{m(r.upFiveYear)}</td>
                  <td className="num">{m(r.upRunRate)}</td>
                  <td className="num"><b>{signedPct(r.upPct, 1)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {!empty && top && <Callout icon="info" title="How to read this.">A driver flexed by +{top.flex}% that moves the total by {pct(Math.abs(top.upPct), 1)} has elasticity {(Math.abs(top.upPct) / (top.flex || 1)).toFixed(2)}: near 1 means the case scales almost linearly with that driver. Headcount usually dominates because it drives every per-employee cost.</Callout>}
    </>
  );
}
