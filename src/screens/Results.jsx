import { PageHeader } from '../components/Shell.jsx';
import { Panel, Kpi, Tabs, YearHeaders, Insights, Callout } from '../components/ui.jsx';
import { StackedColumns, Donut, Lines, Columns } from '../components/charts.jsx';
import { BANDS } from '../model/defaults.js';
import { money, int, pct, signedPct } from '../model/format.js';

const TABS = [['summary', 'Executive summary'], ['breakdown', 'Cost breakdown'], ['annual', 'Annual view'], ['perFte', 'Per-FTE view'], ['cashflow', 'Cash flow']];

export function Results({ model, results, page, go, currency }) {
  const View = { summary: Summary, breakdown: Breakdown, annual: Annual, perFte: PerFte, cashflow: CashFlow }[page] || Summary;
  const s = model.settings;
  return (
    <>
      <PageHeader icon="chart" eyebrow="Output · Results" title="Business case results" description={`Consolidated ${results.N}-year economics${s.gccName ? ` for ${s.gccName}` : ''}: total cost, category breakdown, per-FTE view and cash flow.`} currency={currency} />
      <Tabs tabs={TABS} value={page || 'summary'} onChange={(k) => go('results', k)} />
      {!results.headcount.entered && <Callout tone="warn" icon="alert" title="The case is empty so far." action={<button type="button" className="btn primary sm" onClick={() => go('headcount', 'plan')}>Go to headcount</button>}>Results are calculated from the input steps. Start with the headcount plan, then compensation and the other cost modules.</Callout>}
      <View model={model} results={results} go={go} />
    </>
  );
}

const catSeries = (results) => results.categories.map((c) => ({ name: c.short, color: c.color }));
const yearData = (results, valuesFor) => results.years.map((y) => ({ label: y.label, sub: String(y.year), values: valuesFor(y.index) }));

function buildInsights(results, cur) {
  const t = results.totals; const N = results.N; const L = results.L;
  const cats = [...results.categories].sort((a, b) => b.total - a.total);
  const largest = cats[0];
  const fteChange = t.costPerFte[0] ? ((t.finalCostPerFte - t.costPerFte[0]) / t.costPerFte[0]) * 100 : 0;
  const peak = t.byYear.indexOf(Math.max(...t.byYear));
  const oneTime = t.oneTime.reduce((a, b) => a + b, 0);
  return [
    { icon: 'trend', text: <><b>Cost per FTE {fteChange <= 0 ? 'falls' : 'rises'} {signedPct(fteChange)}</b> from Year 1 to Year {N} ({money(t.costPerFte[0], cur, { compact: true })} → {money(t.finalCostPerFte, cur, { compact: true })}) as fixed costs are spread over a larger center.</> },
    { icon: 'coins', text: <><b>{largest.name}</b> is the largest component at {pct(t.fiveYear ? (largest.total / t.fiveYear) * 100 : 0, 0)} of the {N}-year total.</> },
    { icon: 'layers', text: <><b>One-time costs are {pct(t.fiveYear ? (oneTime / t.fiveYear) * 100 : 0, 1)}</b> of the total ({money(oneTime, cur, { compact: true })}): establishment, fit-out or seat setup and devices.</> },
    { icon: 'chart', text: <><b>Peak annual cost is {results.years[peak].label} ({results.years[peak].year})</b> at {money(t.byYear[peak], cur, { compact: true })}; the Year {N} run-rate is {money(t.runRate, cur, { compact: true })}.</> },
  ];
}

function Summary({ model, results }) {
  const cur = model.settings.currency;
  const t = results.totals; const N = results.N;
  const m = (v) => money(v, cur, { compact: true });
  const s = model.settings;
  return (
    <>
      {(s.companyName || s.plan) && (
        <Panel title={s.gccName || s.companyName || 'Business case'} subtitle={[s.companyName, s.objective, [s.city, s.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}>
          {s.plan && <p style={{ color: 'var(--ink-2)', maxWidth: 900 }}>{s.plan}</p>}
        </Panel>
      )}
      <div className="kpis five">
        <Kpi icon="coins" label={`${N}-year total cost`} value={m(t.fiveYear)} sub="Operating + one-time" />
        <Kpi icon="calc" label="Average annual cost" value={m(t.avgAnnual)} sub="Across the horizon" />
        <Kpi icon="trend" label={`Year ${N} run-rate`} value={m(t.runRate)} sub="Annual cost at scale" />
        <Kpi icon="user" label={`Year ${N} cost per FTE`} value={money(t.finalCostPerFte, cur)} sub="All-in unit cost" />
        <Kpi icon="people" label={`Year ${N} headcount`} value={int(t.finalHeadcount)} sub={`Avg ${int(t.avgHeadcount)} over ${N} years`} />
      </div>
      <div className="grid grid-2-1">
        <Panel title="Annual cost by category" subtitle="Total modelled cost per year, stacked by cost category.">
          <StackedColumns data={yearData(results, (y) => results.categories.map((c) => c.values[y]))} series={catSeries(results)} format={m} height={280} />
        </Panel>
        <Panel title={`${N}-year cost composition`}>
          <Donut slices={results.categories.map((c) => ({ name: c.name, color: c.color, value: c.total }))} format={m} centerValue={m(t.fiveYear)} centerLabel={cur} size={180} />
        </Panel>
      </div>
      {t.fiveYear > 0 && <Panel title="Key insights" subtitle="Generated from the current inputs."><Insights items={buildInsights(results, cur)} /></Panel>}
      <CategoryTable results={results} cur={cur} />
    </>
  );
}

function CategoryTable({ results, cur }) {
  const t = results.totals;
  const m = (v) => money(v, cur, { compact: true });
  return (
    <Panel title="Cost by category" tight>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Cost category</th><YearHeaders years={results.years} extra={['Total', '% of total']} /></tr></thead>
          <tbody>
            {results.categories.map((c) => <tr key={c.key}><td><i className="swatch round" style={{ background: c.color }} />{c.name}</td>{c.values.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num"><b>{m(c.total)}</b></td><td className="num muted">{pct(t.fiveYear ? (c.total / t.fiveYear) * 100 : 0)}</td></tr>)}
            <tr className="total"><td>Total modelled cost</td>{t.byYear.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(t.fiveYear)}</td><td className="num">100%</td></tr>
            <tr><td>Average headcount</td>{results.headcount.average.map((v, i) => <td key={i} className="num muted">{(Math.round(v * 10) / 10).toLocaleString('en-US')}</td>)}<td className="num muted">{int(t.avgHeadcount)}</td><td /></tr>
            <tr><td>Cost per FTE</td>{t.costPerFte.map((v, i) => <td key={i} className="num muted">{money(v, cur)}</td>)}<td className="num muted">{money(t.avgCostPerFte, cur)}</td><td /></tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Breakdown({ model, results }) {
  const cur = model.settings.currency;
  const m = (v) => money(v, cur, { compact: true });
  const t = results.totals;
  const comp = results.compensation;
  const re = results.realEstate;
  const sections = [
    { cat: results.categories[0], rows: BANDS.map((b, i) => ({ name: b.name, values: comp.byBand[i] })) },
    { cat: results.categories[1], rows: [['Hiring & onboarding', results.otherPeople.subtotals.hiring], ['Employee-related operating', results.otherPeople.subtotals.operating], ['Center-level people costs', results.otherPeople.subtotals.center]].map(([name, values]) => ({ name, values })) },
    { cat: results.categories[2], rows: results.corporate.rows.map((r) => ({ name: r.name, values: r.values })) },
    { cat: results.categories[3], rows: [...results.technology.rows.map((r) => ({ name: r.name, values: r.values })), { name: 'End-user devices (new + refresh)', values: results.technology.devices }] },
    { cat: results.categories[4], rows: [['Space (rent / seat fees)', re.space], ['Operating (CAM, utilities, extras)', re.operating], ['Parking', re.parking], ['One-time fit-out / setup', re.setup]].map(([name, values]) => ({ name, values })) },
    { cat: results.categories[5], rows: results.establishment.items.map((it) => ({ name: it.name, values: results.years.map((y) => (y.index === 0 ? it.value : 0)) })) },
  ];
  const cols = results.N + 3;
  return (
    <Panel title="Detailed cost breakdown" subtitle="Every line is calculated from the inputs. Category totals match the executive summary." tight>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Cost line</th><YearHeaders years={results.years} extra={['Total', '% of total']} /></tr></thead>
          <tbody>
            {sections.map((s) => (
              <SectionRows key={s.cat.key} section={s} m={m} fiveYear={t.fiveYear} cols={cols} />
            ))}
            <tr className="total"><td>Total modelled cost</td>{t.byYear.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(t.fiveYear)}</td><td className="num">100%</td></tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SectionRows({ section, m, fiveYear, cols }) {
  const { cat, rows } = section;
  return (
    <>
      <tr className="section"><td colSpan={cols}><i className="swatch round" style={{ background: cat.color }} />{cat.name}</td></tr>
      {rows.map((r) => {
        const total = r.values.reduce((a, b) => a + b, 0);
        return <tr key={r.name}><td style={{ paddingLeft: 30 }}>{r.name}</td>{r.values.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(total)}</td><td className="num muted">{pct(fiveYear ? (total / fiveYear) * 100 : 0)}</td></tr>;
      })}
      <tr className="subtotal"><td>{cat.short} total</td>{cat.values.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(cat.total)}</td><td className="num muted">{pct(fiveYear ? (cat.total / fiveYear) * 100 : 0)}</td></tr>
    </>
  );
}

function Annual({ model, results }) {
  const cur = model.settings.currency;
  const t = results.totals;
  const m = (v) => money(v, cur, { compact: true });
  const yoy = t.byYear.map((v, i) => (i === 0 || !t.byYear[i - 1] ? null : (v / t.byYear[i - 1] - 1) * 100));
  const cols = results.N + 2;
  return (
    <>
      <div className="grid grid-2">
        <Panel title="Operating vs one-time cost" subtitle="One-time items: establishment, fit-out or seat setup and device purchases.">
          <StackedColumns data={yearData(results, (y) => [t.operating[y], t.oneTime[y]])} series={[{ name: 'Operating', color: '#2a78d6' }, { name: 'One-time', color: '#eb6834' }]} format={m} height={260} />
        </Panel>
        <Panel title="Cost per FTE by year" subtitle="Total cost ÷ average headcount.">
          <Columns name="Cost per FTE" data={results.years.map((y) => ({ label: y.label, sub: String(y.year), value: t.costPerFte[y.index] }))} format={(v) => money(v, cur, { compact: true })} height={260} />
        </Panel>
      </div>
      <Panel title="Annual view" subtitle="Complete year-by-year statement of the modelled business case." tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Line</th><YearHeaders years={results.years} extra={['Total']} /></tr></thead>
            <tbody>
              <tr className="section"><td colSpan={cols}>Headcount</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Exit headcount</td>{results.headcount.exit.map((v, i) => <td key={i} className="num">{int(v)}</td>)}<td className="num muted">—</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Average headcount</td>{results.headcount.average.map((v, i) => <td key={i} className="num">{(Math.round(v * 10) / 10).toLocaleString('en-US')}</td>)}<td className="num">{int(t.avgHeadcount)} avg</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>New hires</td>{results.headcount.hires.map((v, i) => <td key={i} className="num">{(Math.round(v * 10) / 10).toLocaleString('en-US')}</td>)}<td className="num">{int(results.headcount.hires.reduce((a, b) => a + b, 0))}</td></tr>
              <tr className="section"><td colSpan={cols}>Cost by category</td></tr>
              {results.categories.map((c) => <tr key={c.key}><td style={{ paddingLeft: 30 }}><i className="swatch round" style={{ background: c.color }} />{c.name}</td>{c.values.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(c.total)}</td></tr>)}
              <tr className="subtotal"><td>Operating cost</td>{t.operating.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(t.operating.reduce((a, b) => a + b, 0))}</td></tr>
              <tr className="subtotal"><td>One-time cost</td>{t.oneTime.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(t.oneTime.reduce((a, b) => a + b, 0))}</td></tr>
              <tr className="total"><td>Total modelled cost</td>{t.byYear.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(t.fiveYear)}</td></tr>
              <tr className="section"><td colSpan={cols}>Unit metrics</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Year-on-year change</td>{yoy.map((v, i) => <td key={i} className="num muted">{v === null ? '—' : signedPct(v, 1)}</td>)}<td className="num muted">—</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Cost per FTE (all-in)</td>{t.costPerFte.map((v, i) => <td key={i} className="num">{money(v, cur)}</td>)}<td className="num">{money(t.avgCostPerFte, cur)} avg</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Operating cost per FTE</td>{t.operating.map((v, i) => <td key={i} className="num muted">{results.headcount.average[i] ? money(v / results.headcount.average[i], cur) : '—'}</td>)}<td className="num muted">—</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Cost per FTE per month</td>{t.costPerFte.map((v, i) => <td key={i} className="num muted">{money(v / 12, cur)}</td>)}<td className="num muted">—</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function PerFte({ model, results }) {
  const cur = model.settings.currency;
  const t = results.totals; const N = results.N; const L = results.L;
  const m = (v) => money(v, cur, { compact: true });
  const perCat = results.perFteByCategory;
  const finalTotal = t.finalCostPerFte || 1;
  const mid = Math.min(2, L);
  const fteChange13 = t.costPerFte[0] ? ((t.costPerFte[mid] - t.costPerFte[0]) / t.costPerFte[0]) * 100 : 0;
  const comp = perCat[0];
  const re = perCat[4];
  const reChange = re.values[0] ? ((re.values[L] - re.values[0]) / re.values[0]) * 100 : 0;
  const late = t.costPerFte[mid] ? ((t.costPerFte[L] - t.costPerFte[mid]) / t.costPerFte[mid]) * 100 : 0;
  return (
    <>
      <div className="kpis">
        <Kpi icon="people" label={`Average headcount (${N} years)`} value={int(t.avgHeadcount)} sub="Basis for per-FTE figures" />
        <Kpi icon="coins" label="Average annual cost per FTE" value={money(t.avgCostPerFte, cur)} sub={`${N}-year total ÷ FTE-years`} />
        <Kpi icon="trend" label={`Run-rate cost per FTE (Year ${N})`} value={money(t.finalCostPerFte, cur)} sub="All-in, at scale" />
        <Kpi icon="calc" label={`${N}-year cost per FTE (cumulative)`} value={money(t.cumulativeCostPerFte, cur, { compact: true })} sub="Total ÷ average headcount" />
      </div>
      <div className="grid grid-2-1">
        <Panel title="Cost per FTE by year" subtitle="Stacked by category, per average FTE.">
          <StackedColumns data={yearData(results, (y) => perCat.map((c) => c.values[y]))} series={catSeries(results)} format={(v) => money(v, cur, { compact: true })} height={280} />
        </Panel>
        <Panel title={`Cost per FTE composition (Year ${N})`}>
          <Donut slices={perCat.map((c) => ({ name: c.name, color: c.color, value: c.values[L] }))} format={(v) => money(v, cur)} centerValue={money(t.finalCostPerFte, cur, { compact: true })} centerLabel={cur} size={180} />
        </Panel>
      </div>
      <Panel title="Cost per FTE by category" tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><YearHeaders years={results.years} extra={[`${N}-year average`, '% of total']} /></tr></thead>
            <tbody>
              {perCat.map((c) => {
                const avg = t.avgHeadcount ? results.categories.find((x) => x.key === c.key).total / (t.avgHeadcount * N) : 0;
                return <tr key={c.key}><td><i className="swatch round" style={{ background: c.color }} />{c.name}</td>{c.values.map((v, i) => <td key={i} className="num">{money(v, cur)}</td>)}<td className="num"><b>{money(avg, cur)}</b></td><td className="num muted">{pct(t.avgCostPerFte ? (avg / t.avgCostPerFte) * 100 : 0)}</td></tr>;
              })}
              <tr className="total"><td>Total cost per FTE</td>{t.costPerFte.map((v, i) => <td key={i} className="num">{money(v, cur)}</td>)}<td className="num">{money(t.avgCostPerFte, cur)}</td><td className="num">100%</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid grid-2">
        <Panel title="Per-FTE cost trend" subtitle="Each category per average FTE, by year.">
          <Lines labels={results.years.map((y) => ({ label: y.label, sub: String(y.year) }))} series={perCat.map((c) => ({ name: c.short, color: c.color, values: c.values }))} format={(v) => money(v, cur, { compact: true })} height={280} endLabels={false} />
        </Panel>
        <Panel title="Key insights (per-FTE view)">
          <Insights columns={2} items={[
            { icon: 'trend', text: <><b>Total cost per FTE changes {signedPct(fteChange13)}</b> from Year 1 to Year {mid + 1} as scale improves.</> },
            { icon: 'coins', text: <><b>Compensation is {pct((comp.values[L] / finalTotal) * 100, 0)}</b> of Year {N} cost per FTE, the largest component.</> },
            { icon: 'building', text: <><b>Real estate cost per FTE changes {signedPct(reChange)}</b> from Year 1 to Year {N} with seat utilisation and escalation.</> },
            { icon: 'laptop', text: <><b>Years {mid + 1} to {N} move {signedPct(late)}</b> per FTE, driven by the experience mix, escalation and device refresh.</> },
          ]} />
        </Panel>
      </div>
    </>
  );
}

function CashFlow({ model, results }) {
  const cur = model.settings.currency;
  const cf = results.cashflow; const N = results.N;
  const m = (v) => money(v, cur, { compact: true });
  const totalOut = cf.totalOut.reduce((a, b) => a + b, 0);
  const oneTimeTotal = cf.oneTime.reduce((a, b) => a + b, 0);
  const peak = cf.totalOut.indexOf(Math.max(...cf.totalOut));
  return (
    <>
      <div className="kpis">
        <Kpi icon="cash" label={`Total cash out (${N} years)`} value={m(totalOut)} sub="Costs + refundable deposits" />
        <Kpi icon="layers" label="One-time cash items" value={m(oneTimeTotal)} sub="Establishment, fit-out or setup, devices" />
        <Kpi icon="building" label="Security deposits" value={m(cf.depositTotal)} sub="Refundable at exit" />
        <Kpi icon="trend" label={`Peak year cash out (${results.years[peak].label})`} value={m(cf.totalOut[peak])} sub={String(results.years[peak].year)} />
      </div>
      <div className="grid grid-2">
        <Panel title="Annual cash out" subtitle="Operating costs, one-time items and security deposits.">
          <StackedColumns data={yearData(results, (y) => [cf.operating[y], cf.oneTime[y], cf.deposits[y]])} series={[{ name: 'Operating', color: '#2a78d6' }, { name: 'One-time', color: '#eb6834' }, { name: 'Deposits', color: '#1baf7a' }]} format={m} height={260} />
        </Panel>
        <Panel title="Cumulative cash out" subtitle="Running total across the horizon.">
          <Lines labels={results.years.map((y) => ({ label: y.label, sub: String(y.year) }))} series={[{ name: 'Cumulative cash out', color: '#2a78d6', values: cf.cumulative }]} format={m} height={260} />
        </Panel>
      </div>
      <Panel title="Cash flow statement" tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Line</th><YearHeaders years={results.years} extra={['Total']} /></tr></thead>
            <tbody>
              <tr><td>Operating costs</td>{cf.operating.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(cf.operating.reduce((a, b) => a + b, 0))}</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>One-time establishment</td>{results.establishment.byYear.map((v, i) => <td key={i} className="num muted">{m(v)}</td>)}<td className="num muted">{m(results.establishment.total)}</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Fit-out / seat setup</td>{results.realEstate.setup.map((v, i) => <td key={i} className="num muted">{m(v)}</td>)}<td className="num muted">{m(results.realEstate.setup.reduce((a, b) => a + b, 0))}</td></tr>
              <tr><td style={{ paddingLeft: 30 }}>Device purchases</td>{results.technology.devices.map((v, i) => <td key={i} className="num muted">{m(v)}</td>)}<td className="num muted">{m(results.technology.devices.reduce((a, b) => a + b, 0))}</td></tr>
              <tr className="subtotal"><td>One-time costs</td>{cf.oneTime.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(oneTimeTotal)}</td></tr>
              <tr><td>Security deposits (refundable)</td>{cf.deposits.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(cf.depositTotal)}</td></tr>
              <tr className="total"><td>Total cash out</td>{cf.totalOut.map((v, i) => <td key={i} className="num">{m(v)}</td>)}<td className="num">{m(totalOut)}</td></tr>
              <tr><td>Cumulative cash out</td>{cf.cumulative.map((v, i) => <td key={i} className="num"><b>{m(v)}</b></td>)}<td className="num muted">—</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
