import { PageHeader, StepNav } from '../components/Shell.jsx';
import { Panel, Kpi, NumField, AssumptionTable, YearHeaders, Callout, Field, FillButton } from '../components/ui.jsx';
import { StackedColumns, Donut } from '../components/charts.jsx';
import { REAL_ESTATE_TYPES } from '../model/defaults.js';
import { money, int, pct } from '../model/format.js';

const RE_SERIES = [
  { key: 'space', name: 'Space (rent / seat fees)', color: '#2a78d6' },
  { key: 'operating', name: 'Operating (CAM, utilities, extras)', color: '#eb6834' },
  { key: 'parking', name: 'Parking', color: '#1baf7a' },
  { key: 'setup', name: 'One-time fit-out / setup', color: '#eda100' },
];

export function RealEstate(props) {
  return props.page === 'assumptions' ? <Assumptions {...props} /> : <Strategy {...props} />;
}

function Strategy({ model, update, currency, nav, go }) {
  const type = model.realEstate.type;
  return (
    <>
      <PageHeader step={4} eyebrow="Step 4 of 6 · Real estate" title="Real estate strategy" description="Choose the type of space the center will occupy. Each option has its own cost structure, commitment profile and set of assumptions on the next page." currency={currency} />
      <div className="type-cards" style={{ marginBottom: 18 }}>
        {REAL_ESTATE_TYPES.map((t) => (
          <button type="button" key={t.key} className={`type-card ${type === t.key ? 'on' : ''}`} onClick={() => update(['realEstate', 'type'], t.key)} aria-pressed={type === t.key}>
            <div className="tc-head"><h3>{t.name}</h3><span className="radio" /></div>
            <span className="tc-tag">{t.tagline}</span>
            <p>{t.description}</p>
            <span className="tc-fit">Best for: {t.fit}</span>
          </button>
        ))}
      </div>
      <Panel title="Describe the real estate plan" subtitle="Location shortlist, phasing (for example coworking for the pilot, then a managed office), sustainability or security requirements, and anything the reader of the case should know.">
        <Field label="Real estate plan" wide>
          <textarea value={model.realEstate.description} onChange={(e) => update(['realEstate', 'description'], e.target.value)} placeholder="e.g. Start in a coworking centre in Whitefield for the first 40 people, move to a managed office of ~120 seats in year 2, and evaluate a conventional lease once headcount passes 300…" />
        </Field>
      </Panel>
      {!type && <Callout tone="warn" icon="alert" title="Select a type of space to continue.">The assumptions page shows only the inputs relevant to the chosen type.</Callout>}
      <StepNav nav={nav} go={go} />
    </>
  );
}

function Assumptions({ model, results, update, currency, nav, go, bench, setBench, fillFromBench }) {
  const type = model.realEstate.type;
  const def = REAL_ESTATE_TYPES.find((t) => t.key === type);
  const cur = model.settings.currency;
  const hc = results.headcount;
  const re = results.realEstate;
  const N = results.N; const L = results.L;
  if (!def) {
    return (
      <>
        <PageHeader step={4} eyebrow="Step 4 of 6 · Real estate" title="Real estate assumptions" currency={currency} />
        <Callout tone="warn" icon="alert" title="No type of space selected." action={<button type="button" className="btn primary sm" onClick={() => go('realEstate', 'strategy')}>Choose a type</button>}>Pick managed office, coworking or a conventional lease on the strategy page first.</Callout>
        <StepNav nav={nav} go={go} />
      </>
    );
  }
  const vals = model.realEstate[type];
  const decimalsFor = (f) => (f.key.endsWith('PerSqft') ? 2 : f.key === 'seatsPct' || f.key === 'escalation' ? 1 : 0);
  return (
    <>
      <PageHeader step={4} eyebrow={`Step 4 of 6 · Real estate · ${def.name}`} title={`${def.name} – assumptions`} description={`Unit cost assumptions for ${def.name.toLowerCase()} space${model.settings.city ? ` in ${model.settings.city}` : ''}. Seats are derived from the headcount plan; costs are calculated across the ${N}-year horizon.`} currency={currency} />
      <AssumptionTable
        title={`${def.name} inputs`} subtitle={def.tagline}
        rows={def.fields.map((f) => ({ ...f, decimals: decimalsFor(f) }))}
        currency={cur}
        getValue={(row) => vals[row.key]}
        setValue={(row, v) => update(['realEstate', type, row.key], v)}
        getBench={(row) => bench(`realEstate.${type}.${row.key}`)}
        setBench={(row, v) => setBench(`realEstate.${type}.${row.key}`, v)}
        actions={<><button type="button" className="btn sm" onClick={() => go('realEstate', 'strategy')}>Change type</button><FillButton onClick={() => fillFromBench(`realEstate.${type}.`)} /></>}
        renderInput={(row) => (row.key === 'parkingRatio'
          ? <span className="ratio"><span className="fixed">1</span><span className="muted">:</span><NumField value={vals.parkingRatio} onChange={(v) => update(['realEstate', type, 'parkingRatio'], v)} size="narrow" decimals={0} min={1} ariaLabel="Employees per parking bay" /></span>
          : <NumField value={vals[row.key]} onChange={(v) => update(['realEstate', type, row.key], v)} prefix={row.prefix} suffix={row.suffix} currency={cur} decimals={decimalsFor(row)} size="wide" ariaLabel={row.name} />)}
      />
      {hc.entered && (
        <Callout icon="info" title="What this produces.">
          Year {N}: <b>{int(hc.seats[L])} {type === 'coworking' ? 'desks' : 'seats'}</b>{type === 'lease' ? <>, <b>{int(re.area[L])} sq ft</b></> : ''}{(type !== 'coworking') ? <>, <b>{int(hc.bays[L])} parking bays</b></> : ''}. Annual real estate cost reaches {money(re.total[L], cur, { compact: true })} in Year {N}; deposits total {money(re.depositTotal, cur, { compact: true })} and sit in cash flow, not operating cost.
        </Callout>
      )}
      <StepNav nav={nav} go={go} />
    </>
  );
}

export function RealEstateSummary({ model, results, currency }) {
  const cur = model.settings.currency;
  const re = results.realEstate;
  const hc = results.headcount;
  const yrs = results.years;
  const N = results.N; const L = results.L;
  const type = model.realEstate.type;
  const def = REAL_ESTATE_TYPES.find((t) => t.key === type);
  const vals = def ? model.realEstate[type] : {};
  const m = (v) => money(v, cur, { compact: true });
  const totals = Object.fromEntries(RE_SERIES.map((s) => [s.key, re[s.key].reduce((t, v) => t + v, 0)]));
  const unitLabel = type === 'coworking' ? 'Cost per desk per month' : type === 'lease' ? 'Rent per sq ft per month' : 'Cost per seat per month';
  const unitValue = type === 'coworking' ? vals.deskCost : type === 'lease' ? vals.rentPerSqft : vals.seatCost;
  return (
    <>
      <PageHeader icon="building" eyebrow="Output · Real estate" title={`${re.typeName} – cost summary`} description={`${N}-year view of space, operating, parking and one-time set-up costs based on the chosen real estate strategy.`} currency={currency} />
      {!type && <Callout tone="warn" icon="alert" title="No real estate type selected.">Complete step 4 to populate this summary.</Callout>}
      {model.realEstate.description && <Callout icon="info" title="Real estate plan.">{model.realEstate.description}</Callout>}
      <div className="kpis">
        <Kpi icon="coins" label={`Total real estate cost (${N} years)`} value={m(re.fiveYear)} sub="Space + operating + parking + setup" />
        <Kpi icon="building" label={`Annual cost (Year ${N})`} value={m(re.total[L])} sub={`${int(hc.seats[L])} ${type === 'coworking' ? 'desks' : 'seats'}${type === 'lease' ? ` · ${int(re.area[L])} sq ft` : ''}`} />
        <Kpi icon="seat" label={unitLabel} value={unitValue !== null && unitValue !== undefined ? money(unitValue, cur, { decimals: type === 'lease' ? 2 : 0 }) : '—'} sub={`${vals.seatsPct ?? '—'}% of headcount seated`} />
        <Kpi icon="cash" label="Security deposits (cash)" value={m(re.depositTotal)} sub="Refundable · excluded from cost" />
      </div>
      <div className="grid grid-2-1">
        <Panel title="Annual real estate cost" subtitle="Space, operating, parking and one-time set-up by year.">
          <StackedColumns data={yrs.map((y) => ({ label: y.label, sub: String(y.year), values: RE_SERIES.map((s) => re[s.key][y.index]) }))} series={RE_SERIES} format={m} height={260} />
        </Panel>
        <Panel title={`${N}-year real estate cost composition`}>
          <Donut slices={RE_SERIES.map((s) => ({ name: s.name, color: s.color, value: totals[s.key] }))} format={m} centerValue={m(re.fiveYear)} centerLabel={cur} />
        </Panel>
      </div>
      <Panel title="Annual cost breakdown" tight>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Cost component</th><YearHeaders years={yrs} extra={['Total', '% of total']} /></tr></thead>
            <tbody>
              {RE_SERIES.map((s) => <tr key={s.key}><td><i className="swatch round" style={{ background: s.color }} />{s.name}</td>{yrs.map((y) => <td key={y.index} className="num">{m(re[s.key][y.index])}</td>)}<td className="num"><b>{m(totals[s.key])}</b></td><td className="num muted">{pct(re.fiveYear ? (totals[s.key] / re.fiveYear) * 100 : 0)}</td></tr>)}
              <tr className="total"><td>Total real estate cost</td>{yrs.map((y) => <td key={y.index} className="num">{m(re.total[y.index])}</td>)}<td className="num">{m(re.fiveYear)}</td><td className="num">100%</td></tr>
              <tr><td><span className="name">Security deposit (cash outlay)</span><span className="sub">Refundable · shown in cash flow, excluded from cost</span></td>{yrs.map((y) => <td key={y.index} className="num muted">{m(re.deposit[y.index])}</td>)}<td className="num muted">{m(re.depositTotal)}</td><td className="num muted">—</td></tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid grid-1-2">
        <Panel title="Key assumptions" tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Assumption</th><th className="num">Value</th><th>Unit</th></tr></thead>
              <tbody>
                <tr><td>Type of space</td><td className="num">{re.typeName}</td><td className="muted">—</td></tr>
                {def?.fields.map((f) => <tr key={f.key}><td>{f.name}</td><td className="num">{vals[f.key] === null || vals[f.key] === undefined ? '—' : f.prefix === 'currency' ? money(vals[f.key], cur, { decimals: f.key.endsWith('PerSqft') ? 2 : 0 }) : f.key === 'parkingRatio' ? `1 : ${vals[f.key]}` : Number(vals[f.key]).toLocaleString('en-US')}</td><td className="muted">{f.unit?.replace('currency', cur)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Headcount and space summary" tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Year</th><YearHeaders years={yrs} /></tr></thead>
              <tbody>
                <tr><td>Exit headcount</td>{hc.exit.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>
                <tr><td>{type === 'coworking' ? 'Desks' : 'Seats'} ({vals.seatsPct ?? '—'}% of headcount)</td>{hc.seats.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>
                <tr><td>New {type === 'coworking' ? 'desks' : 'seats'} added</td>{hc.newSeats.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>
                {type === 'lease' && <tr><td>Leased area (sq ft)</td>{re.area.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>}
                {type !== 'coworking' && <tr><td>Parking bays (1:{vals.parkingRatio ?? '—'})</td>{hc.bays.map((v, i) => <td key={i} className="num">{int(v)}</td>)}</tr>}
                <tr className="total"><td>Real estate cost per FTE (avg)</td>{yrs.map((y) => <td key={y.index} className="num">{hc.average[y.index] ? money(re.total[y.index] / hc.average[y.index], cur) : '—'}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
