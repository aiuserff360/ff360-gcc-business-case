import { PageHeader, StepNav } from '../components/Shell.jsx';
import { Panel, Kpi, AssumptionTable, YearHeaders, Callout, FillButton } from '../components/ui.jsx';
import { StackedColumns } from '../components/charts.jsx';
import { TECHNOLOGY_FIELDS } from '../model/defaults.js';
import { money, int, pct } from '../model/format.js';

export function Technology({ model, results, update, currency, nav, go, bench, setBench, fillFromBench }) {
  const t = model.technology;
  const cur = model.settings.currency;
  const perUserMonth = TECHNOLOGY_FIELDS.filter((f) => f.kind === 'recurring').reduce((s, f) => s + Number(t[f.key] || 0), 0);
  const N = results.N;
  return (
    <>
      <PageHeader step={5} eyebrow="Step 5 of 6 · Technology" title="Technology cost assumptions" description={`Unit cost assumptions for devices, licenses, infrastructure, security, support and connectivity${model.settings.country ? ` in ${model.settings.country}` : ''}. Recurring costs follow average headcount; devices follow new hires and the refresh cycle.`} currency={currency} />
      <AssumptionTable
        rows={TECHNOLOGY_FIELDS.map((f) => ({ ...f, decimals: f.key === 'escalation' ? 1 : 0 }))}
        currency={cur}
        getValue={(row) => t[row.key]}
        setValue={(row, v) => update(['technology', row.key], v)}
        getBench={(row) => bench(`technology.${row.key}`)}
        setBench={(row, v) => setBench(`technology.${row.key}`, v)}
        actions={<FillButton onClick={() => fillFromBench('technology.')} />}
      />
      {perUserMonth > 0 && (
        <Callout icon="info" title="What this produces.">
          Recurring services add up to <b>{money(perUserMonth, cur)} per user per month</b> ({money(perUserMonth * 12, cur)} per year). {results.headcount.entered ? <>Devices: {int(results.technology.devicesBought.reduce((a, b) => a + b, 0))} across the horizon, {money(results.technology.devices.reduce((a, b) => a + b, 0), cur, { compact: true })} in total. {N}-year technology cost: {money(results.technology.fiveYear, cur, { compact: true })}.</> : 'Enter the headcount plan to see annual totals.'}
        </Callout>
      )}
      <StepNav nav={nav} go={go} />
    </>
  );
}

export function TechnologySummary({ model, results, currency }) {
  const cur = model.settings.currency;
  const tech = results.technology;
  const hc = results.headcount;
  const yrs = results.years;
  const N = results.N; const L = results.L;
  const m = (v) => money(v, cur, { compact: true });
  const series = [{ name: 'Recurring services', color: '#2a78d6' }, { name: 'End-user devices', color: '#eb6834' }];
  const devicesTotal = tech.devices.reduce((a, b) => a + b, 0);
  const perFteMonth = hc.average[L] ? tech.recurring[L] / hc.average[L] / 12 : 0;
  return (
    <>
      <PageHeader icon="monitor" eyebrow="Output · Technology" title="Technology cost summary" description={`${N}-year view of recurring technology services and end-user device spend, including the refresh cycle.`} currency={currency} />
      {!hc.entered && <Callout tone="warn" icon="alert" title="No headcount entered yet.">Technology costs follow headcount, so complete steps 2 and 5 first.</Callout>}
      <div className="kpis">
        <Kpi icon="coins" label={`Total technology cost (${N} years)`} value={m(tech.fiveYear)} sub={`${pct(tech.fiveYear ? (devicesTotal / tech.fiveYear) * 100 : 0, 0)} devices`} />
        <Kpi icon="trend" label={`Annual cost (Year ${N})`} value={m(tech.total[L])} sub="Recurring + devices" />
        <Kpi icon="user" label="Recurring cost per user / month" value={money(perFteMonth, cur)} sub={`Year ${N}, average headcount`} />
        <Kpi icon="laptop" label={`Devices purchased (${N} years)`} value={int(tech.devicesBought.reduce((a, b) => a + b, 0))} sub={`${int(tech.devicesRefreshed.reduce((a, b) => a + b, 0))} of which refresh`} />
      </div>
      <div className="grid grid-2-1">
        <Panel title="Annual technology cost" subtitle="Recurring per-user services and one-time device purchases.">
          <StackedColumns data={yrs.map((y) => ({ label: y.label, sub: String(y.year), values: [tech.recurring[y.index], tech.devices[y.index]] }))} series={series} format={m} height={260} />
        </Panel>
        <Panel title="Device schedule" subtitle={model.technology.refreshYears ? `Refresh cycle: every ${model.technology.refreshYears} years.` : 'No refresh cycle entered.'} tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Devices</th><YearHeaders years={yrs} /></tr></thead>
              <tbody>
                <tr><td>New hires (net additions)</td>{tech.devicesNew.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>
                <tr><td>Refresh replacements</td>{tech.devicesRefreshed.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>
                <tr className="subtotal"><td>Devices purchased</td>{tech.devicesBought.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>
                <tr className="total"><td>Device cost</td>{tech.devices.map((v, i) => <td key={i} className="num">{m(v)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="Annual cost breakdown" tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cost component</th><YearHeaders years={yrs} extra={['Total', '% of total']} /></tr></thead>
            <tbody>
              {tech.rows.map((r) => {
                const total = r.values.reduce((a, b) => a + b, 0);
                return <tr key={r.key}><td>{r.name}</td>{r.values.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num"><b>{m(total)}</b></td><td className="num muted">{pct(tech.fiveYear ? (total / tech.fiveYear) * 100 : 0)}</td></tr>;
              })}
              <tr className="subtotal"><td>Recurring services</td>{tech.recurring.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(tech.recurring.reduce((a, b) => a + b, 0))}</td><td className="num muted">{pct(tech.fiveYear ? (tech.recurring.reduce((a, b) => a + b, 0) / tech.fiveYear) * 100 : 0)}</td></tr>
              <tr><td>End-user devices (new + refresh)</td>{tech.devices.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num"><b>{m(devicesTotal)}</b></td><td className="num muted">{pct(tech.fiveYear ? (devicesTotal / tech.fiveYear) * 100 : 0)}</td></tr>
              <tr className="total"><td>Total technology cost</td>{tech.total.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(tech.fiveYear)}</td><td className="num">100%</td></tr>
              <tr><td>Technology cost per FTE (avg)</td>{yrs.map((y) => <td key={y.index} className="num muted">{hc.average[y.index] ? money(tech.total[y.index] / hc.average[y.index], cur) : '—'}</td>)}<td className="num muted">—</td><td /></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
