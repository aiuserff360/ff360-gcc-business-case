import { PageHeader, StepNav } from '../components/Shell.jsx';
import { Panel, Kpi, NumField, Bench, VsAvg, AssumptionTable, ModeBar, YearHeaders, RowBadge, FillButton, Callout } from '../components/ui.jsx';
import { StackedColumns, Donut } from '../components/charts.jsx';
import { ESTABLISHMENT_ITEMS, INPUT_MODES } from '../model/defaults.js';
import { money, pct } from '../model/format.js';

const CORP_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export function CenterOps(props) {
  return props.page === 'establishment' ? <Establishment {...props} /> : <Corporate {...props} />;
}

function Corporate({ model, results, update, mutate, currency, nav, go, bench, setBench, fillFromBench }) {
  const cc = model.corporate;
  const cur = model.settings.currency;
  const yrs = results.years;
  const Y = results.Y;
  const byYear = cc.mode === 'byYear';
  const setMode = (mode) => mutate((d) => {
    d.corporate.mode = mode;
    if (mode === 'byYear') d.corporate.items.forEach((item) => { const r = results.corporate.rows.find((x) => x.id === item.id); item.byYear = Y.map((y) => (has(item.base) ? Math.round(r.values[y]) : null)); });
  });
  const setRate = (v) => mutate((d) => { d.corporate.escalation = v; d.corporate.items.forEach((it) => { it.escalation = v; }); });
  return (
    <>
      <PageHeader step={6} eyebrow="Step 6 of 6 · Center operations" title="Annual center / corporate costs" description="Recurring annual costs to operate the GCC entity. These are fixed, center-level costs not directly driven by headcount." currency={currency} />
      <ModeBar modes={INPUT_MODES} mode={cc.mode} onMode={setMode} rate={cc.escalation} onRate={setRate} benchRate={bench('corporate.escalation')} onBenchRate={(v) => setBench('corporate.escalation', v)} />
      <Panel title="Cost assumptions" subtitle="Base annual cost per component. In escalation mode each component grows by its own rate." tight actions={<FillButton onClick={() => fillFromBench('corporate.')} />}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th style={{ width: 44 }}>#</th><th>Cost component</th><th>Base annual cost<small>{cur} · your input</small></th><th>Industry average</th><th>vs avg</th><th>Escalation<small>%</small></th><YearHeaders years={yrs} /><th>Notes</th></tr>
            </thead>
            <tbody>
              {cc.items.map((item, i) => (
                <tr key={item.id}>
                  <td><RowBadge index={i} /></td>
                  <td><span className="name">{item.name}</span><span className="sub">Per center / year</span></td>
                  <td><NumField value={item.base} onChange={(v) => update(['corporate', 'items', i, 'base'], v)} prefix="currency" currency={cur} decimals={0} disabled={byYear} /></td>
                  <td><Bench value={bench(`corporate.${item.id}`)} onChange={(v) => setBench(`corporate.${item.id}`, v)} prefix="currency" currency={cur} decimals={0} /></td>
                  <td><VsAvg value={item.base} avg={bench(`corporate.${item.id}`)} /></td>
                  <td><NumField value={item.escalation} onChange={(v) => update(['corporate', 'items', i, 'escalation'], v)} suffix="%" size="narrow" disabled={cc.mode !== 'escalate'} /></td>
                  {Y.map((y) => (
                    <td key={y} className="num">
                      {byYear
                        ? <NumField value={item.byYear[y]} onChange={(v) => update(['corporate', 'items', i, 'byYear', y], v)} decimals={0} size="narrow" ariaLabel={`${item.name} ${yrs[y].label}`} />
                        : <span className="tnum muted">{has(item.base) ? money(results.corporate.rows[i].values[y], cur) : '—'}</span>}
                    </td>
                  ))}
                  <td><input className="text-input" style={{ minWidth: 120 }} value={item.note || ''} onChange={(e) => update(['corporate', 'items', i, 'note'], e.target.value)} /></td>
                </tr>
              ))}
              <tr className="total">
                <td /><td>Total annual center / corporate costs</td>
                <td className="num">{money(cc.items.reduce((t, it) => t + Number(it.base || 0), 0), cur)}</td><td /><td /><td />
                {Y.map((y) => <td key={y} className="num">{money(results.corporate.total[y], cur)}</td>)}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <StepNav nav={nav} go={go} />
    </>
  );
}

function Establishment({ model, results, update, currency, nav, go, bench, setBench, fillFromBench }) {
  const cur = model.settings.currency;
  return (
    <>
      <PageHeader step={6} eyebrow="Step 6 of 6 · Center operations" title="One-time establishment cost" description={`One-time costs to establish and mobilise the GCC${model.settings.country ? ` in ${model.settings.country}` : ''}. Booked upfront in Year 1.`} currency={currency} />
      <AssumptionTable
        rows={ESTABLISHMENT_ITEMS.map((it) => ({ ...it, prefix: 'currency', unit: 'currency (one-time)', decimals: 0 }))}
        currency={cur}
        getValue={(row) => model.establishment[row.key]}
        setValue={(row, v) => update(['establishment', row.key], v)}
        getBench={(row) => bench(`establishment.${row.key}`)}
        setBench={(row, v) => setBench(`establishment.${row.key}`, v)}
        actions={<FillButton onClick={() => fillFromBench('establishment.')} />}
      />
      <div className="total-banner">
        <div className="left"><div className="kpi-icon"><span style={{ fontWeight: 700 }}>Σ</span></div><div><h3>Total initial establishment cost</h3><p>Sum of all one-time establishment costs. Included in the Year 1 total and in cash flow.</p></div></div>
        <div className="amount">{money(results.establishment.total, cur)}<small>{cur} · one-time</small></div>
      </div>
      <StepNav nav={nav} go={go} />
    </>
  );
}

export function CenterSummary({ model, results, currency }) {
  const cur = model.settings.currency;
  const yrs = results.years;
  const N = results.N; const L = results.L;
  const corp = results.corporate;
  const est = results.establishment;
  const m = (v) => money(v, cur, { compact: true });
  const series = corp.rows.map((r, i) => ({ name: r.name, color: CORP_COLORS[i % CORP_COLORS.length] }));
  const combined = corp.fiveYear + est.total;
  return (
    <>
      <PageHeader icon="gear" eyebrow="Output · Center operations" title="Center operations summary" description="Recurring corporate costs and the one-time establishment investment, combined into the center operations view." currency={currency} />
      {combined === 0 && <Callout tone="warn" icon="alert" title="No center operations costs entered yet.">Complete step 6 to populate this summary.</Callout>}
      <div className="kpis">
        <Kpi icon="coins" label={`Corporate costs (${N} years)`} value={m(corp.fiveYear)} sub="Recurring center-level costs" />
        <Kpi icon="trend" label={`Corporate run-rate (Year ${N})`} value={m(corp.total[L])} sub={`${m(corp.total[0])} in Year 1`} />
        <Kpi icon="building" label="One-time establishment" value={m(est.total)} sub="Year 1 upfront investment" />
        <Kpi icon="layers" label={`Center operations total (${N} years)`} value={m(combined)} sub={`${pct(results.totals.fiveYear ? (combined / results.totals.fiveYear) * 100 : 0)} of total cost`} />
      </div>
      <div className="grid grid-2-1">
        <Panel title="Annual corporate costs by component">
          <StackedColumns data={yrs.map((y) => ({ label: y.label, sub: String(y.year), values: corp.rows.map((r) => r.values[y.index]) }))} series={series} format={m} height={270} />
        </Panel>
        <Panel title="Establishment cost composition">
          <Donut slices={est.items.map((it, i) => ({ name: it.name, color: CORP_COLORS[i % CORP_COLORS.length], value: it.value }))} format={m} centerValue={m(est.total)} centerLabel="one-time" size={170} />
        </Panel>
      </div>
      <Panel title="Annual cost breakdown" tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cost component</th><YearHeaders years={yrs} extra={['Total', '% of total']} /></tr></thead>
            <tbody>
              {corp.rows.map((r, i) => {
                const total = r.values.reduce((a, b) => a + b, 0);
                return <tr key={r.id}><td><i className="swatch round" style={{ background: CORP_COLORS[i % CORP_COLORS.length] }} />{r.name}</td>{r.values.map((v, y) => <td key={y} className="num">{m(v)}</td>)}<td className="num"><b>{m(total)}</b></td><td className="num muted">{pct(combined ? (total / combined) * 100 : 0)}</td></tr>;
              })}
              <tr className="subtotal"><td>Total corporate costs</td>{corp.total.map((v, y) => <td key={y} className="num">{m(v)}</td>)}<td className="num">{m(corp.fiveYear)}</td><td className="num muted">{pct(combined ? (corp.fiveYear / combined) * 100 : 0)}</td></tr>
              <tr><td>One-time establishment</td>{est.byYear.map((v, y) => <td key={y} className="num">{m(v)}</td>)}<td className="num"><b>{m(est.total)}</b></td><td className="num muted">{pct(combined ? (est.total / combined) * 100 : 0)}</td></tr>
              <tr className="total"><td>Center operations total</td>{yrs.map((y) => <td key={y.index} className="num">{m(corp.total[y.index] + est.byYear[y.index])}</td>)}<td className="num">{m(combined)}</td><td className="num">100%</td></tr>
              <tr><td>Corporate cost per FTE (avg)</td>{yrs.map((y) => <td key={y.index} className="num muted">{results.headcount.average[y.index] ? money(corp.total[y.index] / results.headcount.average[y.index], cur) : '—'}</td>)}<td className="num muted">—</td><td /></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
