import { PageHeader, StepNav } from '../components/Shell.jsx';
import { Panel, Kpi, NumField, Bench, VsAvg, ModeBar, YearHeaders, Callout, Swatch, FillButton } from '../components/ui.jsx';
import { StackedColumns, Columns, Donut } from '../components/charts.jsx';
import { BANDS, BAND_COLORS, INPUT_MODES } from '../model/defaults.js';
import { money, int, pct, signedPct } from '../model/format.js';

const COMP_SERIES = [
  { key: 'base', name: 'Base salary', color: '#2a78d6' },
  { key: 'variable', name: 'Variable pay', color: '#eb6834' },
  { key: 'allowances', name: 'Other allowances', color: '#1baf7a' },
  { key: 'benefits', name: 'Statutory & other benefits', color: '#eda100' },
];
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export function People(props) {
  return props.page === 'other' ? <OtherPeople {...props} /> : <Compensation {...props} />;
}

function Compensation({ model, results, update, mutate, currency, nav, go, bench, setBench, fillFromBench }) {
  const c = model.compensation;
  const cur = model.settings.currency;
  const yrs = results.years;
  const setMode = (mode) => mutate((d) => {
    d.compensation.mode = mode;
    if (mode === 'byYear') d.compensation.bands.forEach((b, i) => { b.baseByYear = results.compensation.perBand[i].map((y) => (has(b.base) ? Math.round(y.base) : null)); });
  });
  const setRate = (v) => mutate((d) => { d.compensation.escalation = v; d.compensation.bands.forEach((b) => { b.escalation = v; }); });

  return (
    <>
      <PageHeader step={3} eyebrow="Step 3 of 6 · People costs" title="Compensation" description="Annual compensation and benefit assumptions by experience band. Combined with the headcount plan and experience mix to calculate people costs. The industry-average column is a reference you can position against." currency={currency} />
      <ModeBar label="Compensation mode" modes={INPUT_MODES} mode={c.mode} onMode={setMode} rate={c.escalation} onRate={setRate} benchRate={bench('compensation.escalation')} onBenchRate={(v) => setBench('compensation.escalation', v)} rateNote="applied to all salary components" />

      <Panel title="Compensation by experience band" subtitle="Annual figures per FTE. Variable pay and allowances are a percentage of base salary." tight actions={<FillButton onClick={() => fillFromBench('compensation.')} />}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Experience band</th>
                <th>Base annual salary<small>{cur} per FTE · your input</small></th>
                <th>Industry average<small>base salary</small></th>
                <th>vs avg</th>
                <th>Variable pay<small>% of base</small></th>
                <th>Industry avg<small>variable</small></th>
                <th>Other allowances<small>% of base</small></th>
                <th>Industry avg<small>allowances</small></th>
                {c.mode === 'escalate' && <th>Annual escalation<small>%</small></th>}
                <th className="num">Fully loaded cost / FTE<small>Year 1, incl. benefits</small></th>
              </tr>
            </thead>
            <tbody>
              {BANDS.map((b, i) => {
                const band = c.bands[i];
                const k = `compensation.bands.${i}`;
                return (
                  <tr key={b.id}>
                    <td><Swatch color={BAND_COLORS[i]} round /><span className="name" style={{ display: 'inline' }}>{b.name}</span><span className="sub">{b.roles}</span></td>
                    <td><NumField value={band.base} onChange={(v) => update(['compensation', 'bands', i, 'base'], v)} prefix="currency" currency={cur} decimals={0} size="wide" ariaLabel={`${b.name} base salary`} /></td>
                    <td><Bench value={bench(`${k}.base`)} onChange={(v) => setBench(`${k}.base`, v)} prefix="currency" currency={cur} decimals={0} /></td>
                    <td><VsAvg value={band.base} avg={bench(`${k}.base`)} /></td>
                    <td><NumField value={band.variablePct} onChange={(v) => update(['compensation', 'bands', i, 'variablePct'], v)} suffix="%" size="narrow" /></td>
                    <td><Bench value={bench(`${k}.variablePct`)} onChange={(v) => setBench(`${k}.variablePct`, v)} suffix="%" /></td>
                    <td><NumField value={band.allowancePct} onChange={(v) => update(['compensation', 'bands', i, 'allowancePct'], v)} suffix="%" size="narrow" /></td>
                    <td><Bench value={bench(`${k}.allowancePct`)} onChange={(v) => setBench(`${k}.allowancePct`, v)} suffix="%" /></td>
                    {c.mode === 'escalate' && <td><NumField value={band.escalation} onChange={(v) => update(['compensation', 'bands', i, 'escalation'], v)} suffix="%" size="narrow" /></td>}
                    <td className="num computed"><b>{has(band.base) ? money(results.compensation.perBand[i][0].perFte, cur) : '—'}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {c.mode === 'byYear' && (
        <Panel title="Base salary by year" subtitle="Base annual salary per FTE for each band and year. Variable pay, allowances and benefits follow each year's base." tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Experience band</th><YearHeaders years={yrs} /></tr></thead>
              <tbody>
                {BANDS.map((b, i) => (
                  <tr key={b.id}>
                    <td><Swatch color={BAND_COLORS[i]} round />{b.name}</td>
                    {results.Y.map((y) => <td key={y} className="num"><NumField value={c.bands[i].baseByYear[y]} onChange={(v) => update(['compensation', 'bands', i, 'baseByYear', y], v)} prefix="currency" currency={cur} decimals={0} ariaLabel={`${b.name} base ${yrs[y].label}`} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel title="Statutory and other benefit assumptions" subtitle="Percentage components apply to basic salary; per-employee components are annual amounts per FTE." tight
        actions={<div className="rate" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-2)' }}><span>Basic salary as % of base</span><NumField value={c.basicPct} onChange={(v) => update(['compensation', 'basicPct'], v)} suffix="%" size="narrow" /><span className="muted" style={{ fontWeight: 500 }}>avg</span><Bench value={bench('compensation.basicPct')} onChange={(v) => setBench('compensation.basicPct', v)} suffix="%" /></div>}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Component</th><th>Type</th><th>Your input</th><th>Industry average</th><th>vs avg</th><th>Apply to</th><th>Notes</th></tr></thead>
            <tbody>
              {c.benefits.map((ben, i) => {
                const k = `compensation.benefits.${ben.id}`;
                const isPct = ben.type === 'pctOfBasic';
                return (
                  <tr key={ben.id}>
                    <td><span className="name">{ben.name}</span></td>
                    <td>
                      <select className="select" value={ben.type} onChange={(e) => update(['compensation', 'benefits', i, 'type'], e.target.value)}>
                        <option value="pctOfBasic">% of basic</option>
                        <option value="perEmployee">Per employee / year</option>
                      </select>
                    </td>
                    <td>{isPct ? <NumField value={ben.value} onChange={(v) => update(['compensation', 'benefits', i, 'value'], v)} suffix="%" size="narrow" /> : <NumField value={ben.value} onChange={(v) => update(['compensation', 'benefits', i, 'value'], v)} prefix="currency" currency={cur} decimals={0} />}</td>
                    <td>{isPct ? <Bench value={bench(k)} onChange={(v) => setBench(k, v)} suffix="%" /> : <Bench value={bench(k)} onChange={(v) => setBench(k, v)} prefix="currency" currency={cur} decimals={0} />}</td>
                    <td><VsAvg value={ben.value} avg={bench(k)} /></td>
                    <td>
                      <select className="select" value={String(ben.applyTo)} onChange={(e) => update(['compensation', 'benefits', i, 'applyTo'], e.target.value === 'all' ? 'all' : Number(e.target.value))}>
                        <option value="all">All bands</option>
                        {BANDS.map((b, bi) => <option key={b.id} value={bi}>{b.name} only</option>)}
                      </select>
                    </td>
                    <td><input className="text-input" value={ben.note || ''} onChange={(e) => update(['compensation', 'benefits', i, 'note'], e.target.value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Fully loaded cost per FTE (Year 1)" subtitle="How each band's annual cost builds up from the inputs above." tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Component</th>{BANDS.map((b, i) => <th key={b.id} className="num"><Swatch color={BAND_COLORS[i]} round />{b.short}</th>)}</tr></thead>
            <tbody>
              {['base', 'variable', 'allowances', 'benefits'].map((k) => (
                <tr key={k}><td>{COMP_SERIES.find((s) => s.key === k).name}</td>{BANDS.map((_, i) => <td key={i} className="num">{money(results.compensation.perBand[i][0][k], cur)}</td>)}</tr>
              ))}
              <tr className="total"><td>Cost per FTE</td>{BANDS.map((_, i) => <td key={i} className="num">{money(results.compensation.perBand[i][0].perFte, cur)}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <StepNav nav={nav} go={go} />
    </>
  );
}

function OtherPeople({ model, results, update, mutate, currency, nav, go, bench, setBench, fillFromBench }) {
  const op = model.otherPeople;
  const cur = model.settings.currency;
  const yrs = results.years;
  const Y = results.Y;
  const hc = results.headcount;
  const byYear = op.mode === 'byYear';
  const unitOf = (row, y) => (byYear ? Number(row.byYear[y] ?? row.value ?? 0) : op.mode === 'escalate' ? Number(row.value || 0) * Math.pow(1 + Number(op.escalation || 0) / 100, y) : Number(row.value || 0));
  const setMode = (mode) => mutate((d) => {
    const prev = d.otherPeople.mode;
    d.otherPeople.mode = mode;
    if (mode === 'byYear' && prev !== 'byYear') {
      ['hiring', 'operating', 'center'].forEach((sec) => d.otherPeople[sec].forEach((row) => {
        row.byYear = Y.map((y) => (has(row.value) ? Math.round(prev === 'escalate' ? Number(row.value) * Math.pow(1 + Number(d.otherPeople.escalation || 0) / 100, y) : Number(row.value)) : null));
      }));
    }
  });

  const section = ({ sec, title, subtitle, icon, unitLabel, driverLabel, applyAllLabel, driver, withEligibility }) => {
    const rows = op[sec];
    const computed = results.otherPeople[sec];
    return (
      <Panel title={title} subtitle={subtitle} icon={icon} tight>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cost component</th><th>Unit</th><th>Your input<small>{cur}</small></th><th>Industry average</th><th>vs avg</th>
                {withEligibility && <><th>Apply to</th><th>Eligibility<small>% of {driverLabel.toLowerCase()}</small></th></>}
                {yrs.map((y) => <th key={y.index} className="num">{y.label}<small>{y.year} · unit</small></th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const k = `otherPeople.${sec}.${row.id}`;
                return (
                  <tr key={row.id}>
                    <td><span className="name">{row.name}</span></td>
                    <td className="muted nowrap">{unitLabel}</td>
                    <td><NumField value={row.value} onChange={(v) => update(['otherPeople', sec, ri, 'value'], v)} prefix="currency" currency={cur} decimals={0} disabled={byYear} /></td>
                    <td><Bench value={bench(k)} onChange={(v) => setBench(k, v)} prefix="currency" currency={cur} decimals={0} /></td>
                    <td><VsAvg value={row.value} avg={bench(k)} /></td>
                    {withEligibility && (
                      <>
                        <td>
                          <select className="select" value={row.applyTo} onChange={(e) => { const v = e.target.value; mutate((d) => { d.otherPeople[sec][ri].applyTo = v; if (v === 'all') d.otherPeople[sec][ri].eligibility = 100; }); }}>
                            <option value="all">{applyAllLabel}</option>
                            <option value="selected">Selected roles</option>
                          </select>
                        </td>
                        <td><NumField value={row.eligibility} onChange={(v) => update(['otherPeople', sec, ri, 'eligibility'], v === null ? null : Math.min(v, 100))} suffix="%" size="narrow" disabled={row.applyTo === 'all'} /></td>
                      </>
                    )}
                    {Y.map((y) => (
                      <td key={y} className="num">
                        {byYear
                          ? <NumField value={row.byYear[y]} onChange={(v) => update(['otherPeople', sec, ri, 'byYear', y], v)} decimals={0} size="narrow" ariaLabel={`${row.name} ${yrs[y].label}`} />
                          : <span className="tnum muted">{has(row.value) ? money(unitOf(row, y), cur) : '—'}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {driver && (
                <tr className="subtotal">
                  <td colSpan={withEligibility ? 7 : 5}><span className="name">{driverLabel} (driver)</span></td>
                  {Y.map((y) => <td key={y} className="num">{(Math.round(driver[y] * 10) / 10).toLocaleString('en-US')}</td>)}
                </tr>
              )}
              <tr className="total">
                <td colSpan={withEligibility ? 7 : 5}>Annual {title.toLowerCase()}</td>
                {Y.map((y) => <td key={y} className="num">{money(computed.reduce((t, r) => t + r.values[y], 0), cur, { compact: true })}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    );
  };

  return (
    <>
      <PageHeader step={3} eyebrow="Step 3 of 6 · People costs" title="Other people costs" description="Non-salary people costs. Hiring costs follow new hires, operating costs follow average headcount, and center-level costs are fixed per year." currency={currency} />
      <ModeBar modes={INPUT_MODES} mode={op.mode} onMode={setMode} rate={op.escalation} onRate={(v) => update(['otherPeople', 'escalation'], v)} benchRate={bench('otherPeople.escalation')} onBenchRate={(v) => setBench('otherPeople.escalation', v)} />
      <div className="inline-actions" style={{ marginBottom: 14 }}><FillButton onClick={() => fillFromBench('otherPeople.')} /></div>
      {section({ sec: 'hiring', title: 'Hiring & onboarding costs', subtitle: 'Costs incurred per new hire during recruitment and onboarding.', icon: 'user', unitLabel: 'Per new hire', driverLabel: 'New hires', applyAllLabel: 'All new hires', driver: hc.hires, withEligibility: true })}
      {section({ sec: 'operating', title: 'Employee-related operating costs', subtitle: 'Recurring people-related costs based on average headcount.', icon: 'people', unitLabel: 'Per FTE / year', driverLabel: 'Average FTE', applyAllLabel: 'All FTE', driver: hc.average, withEligibility: true })}
      {section({ sec: 'center', title: 'Center-level people costs', subtitle: 'Fixed people-related costs, not driven by headcount.', icon: 'building', unitLabel: 'Per center / year', driverLabel: '', driver: null, withEligibility: false })}
      <div className="total-banner">
        <div className="left"><div className="kpi-icon"><span style={{ fontWeight: 700 }}>Σ</span></div><div><h3>Total other people costs ({results.N} years)</h3><p>Hiring & onboarding + employee operating + center-level costs.</p></div></div>
        <div className="amount">{money(results.otherPeople.fiveYear, cur)}<small>{cur} · {results.N}-year total</small></div>
      </div>
      <StepNav nav={nav} go={go} />
    </>
  );
}

export function PeopleSummary({ model, results, currency }) {
  const cur = model.settings.currency;
  const yrs = results.years;
  const N = results.N; const L = results.L;
  const comp = results.compensation;
  const op = results.otherPeople;
  const hc = results.headcount;
  const peopleTotal = comp.fiveYear + op.fiveYear;
  const share = results.totals.fiveYear ? (peopleTotal / results.totals.fiveYear) * 100 : 0;
  const growth = hc.exit[0] ? ((hc.exit[L] - hc.exit[0]) / hc.exit[0]) * 100 : 0;
  const compPerFte = yrs.map((y) => (hc.average[y.index] ? comp.total[y.index] / hc.average[y.index] : 0));
  const m = (v) => money(v, cur, { compact: true });
  return (
    <>
      <PageHeader icon="coins" eyebrow="Output · People costs" title="People cost summary" description={`Total compensation and other people costs across the ${N}-year horizon, with the per-FTE view by experience band.`} currency={currency} />
      {!hc.entered && <Callout tone="warn" icon="alert" title="No headcount entered yet.">People costs are headcount × unit costs, so complete steps 2 and 3 first.</Callout>}
      <div className="kpis">
        <Kpi icon="people" label={`Total headcount (Year ${N})`} value={int(hc.exit[L])} delta={{ good: growth >= 0, text: signedPct(growth) }} sub={`vs Year 1 (${int(hc.exit[0])})`} />
        <Kpi icon="coins" label={`Total compensation (${N} years)`} value={m(comp.fiveYear)} sub={`+ ${m(op.fiveYear)} other people costs`} />
        <Kpi icon="user" label={`Compensation per FTE (Year ${N})`} value={money(compPerFte[L], cur)} sub="Fully loaded, incl. benefits" />
        <Kpi icon="trend" label="People cost share of total" value={pct(share, 1)} sub="Compensation + other people costs" />
      </div>
      <div className="grid grid-2">
        <Panel title="Total compensation cost by component" subtitle="Base salary, variable pay, allowances and benefits per year.">
          <StackedColumns data={yrs.map((y) => ({ label: y.label, sub: String(y.year), values: COMP_SERIES.map((s) => comp.byComponent[s.key][y.index]) }))} series={COMP_SERIES} format={m} height={260} />
        </Panel>
        <Panel title="Compensation cost per FTE" subtitle="Total compensation ÷ average headcount, each year.">
          <Columns name="Compensation per FTE" data={yrs.map((y) => ({ label: y.label, sub: String(y.year), value: compPerFte[y.index] }))} format={(v) => money(v, cur, { compact: true })} height={260} />
        </Panel>
      </div>
      <div className="grid grid-2">
        <Panel title="Compensation by experience band" subtitle="Fully loaded cost per band (band FTE × cost per FTE)." tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Experience band</th><YearHeaders years={yrs} extra={['Total']} /></tr></thead>
              <tbody>
                {BANDS.map((b, bi) => <tr key={b.id}><td><Swatch color={BAND_COLORS[bi]} round />{b.name}</td>{yrs.map((y) => <td key={y.index} className="num">{m(comp.byBand[bi][y.index])}</td>)}<td className="num"><b>{m(comp.byBand[bi].reduce((t, v) => t + v, 0))}</b></td></tr>)}
                <tr className="total"><td>Total compensation</td>{yrs.map((y) => <td key={y.index} className="num">{m(comp.total[y.index])}</td>)}<td className="num">{m(comp.fiveYear)}</td></tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={`Compensation cost by component (${N}-year total)`}>
          <Donut slices={COMP_SERIES.map((s) => ({ name: s.name, color: s.color, value: comp.byComponent[s.key].reduce((t, v) => t + v, 0) }))} format={m} centerValue={m(comp.fiveYear)} centerLabel={cur} />
        </Panel>
      </div>
      <Panel title="Other people costs" subtitle="Hiring & onboarding, employee operating and center-level costs." tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cost group</th><YearHeaders years={yrs} extra={['Total', '% of people cost']} /></tr></thead>
            <tbody>
              {[['hiring', 'Hiring & onboarding'], ['operating', 'Employee-related operating'], ['center', 'Center-level people costs']].map(([k, label]) => {
                const total = op.subtotals[k].reduce((t, v) => t + v, 0);
                return <tr key={k}><td>{label}</td>{yrs.map((y) => <td key={y.index} className="num">{m(op.subtotals[k][y.index])}</td>)}<td className="num"><b>{m(total)}</b></td><td className="num muted">{pct(peopleTotal ? (total / peopleTotal) * 100 : 0)}</td></tr>;
              })}
              <tr className="subtotal"><td>Total other people costs</td>{yrs.map((y) => <td key={y.index} className="num">{m(op.total[y.index])}</td>)}<td className="num">{m(op.fiveYear)}</td><td className="num muted">{pct(peopleTotal ? (op.fiveYear / peopleTotal) * 100 : 0)}</td></tr>
              <tr><td>Total compensation</td>{yrs.map((y) => <td key={y.index} className="num">{m(comp.total[y.index])}</td>)}<td className="num">{m(comp.fiveYear)}</td><td className="num muted">{pct(peopleTotal ? (comp.fiveYear / peopleTotal) * 100 : 0)}</td></tr>
              <tr className="total"><td>Total people cost</td>{yrs.map((y) => <td key={y.index} className="num">{m(comp.total[y.index] + op.total[y.index])}</td>)}<td className="num">{m(peopleTotal)}</td><td className="num">100%</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
