import { useState } from 'react';
import { PageHeader, StepNav } from '../components/Shell.jsx';
import { Panel, Kpi, NumField, Segmented, YearHeaders, StatusCheck, Callout, Swatch, Field } from '../components/ui.jsx';
import { Columns, Stacked100, Pyramid, StackedColumns } from '../components/charts.jsx';
import { BANDS, BAND_COLORS } from '../model/defaults.js';
import { int, signedPct, pct } from '../model/format.js';

const bandSeries = BANDS.map((b, i) => ({ name: b.name, color: BAND_COLORS[i], ink: i < 2 ? '#0b1f3a' : '#fff' }));
const r1 = (v) => (Math.round(v * 10) / 10).toLocaleString('en-US');
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export function Headcount({ model, results, update, mutate, currency, nav, go }) {
  const hc = results.headcount;
  const yrs = results.years;
  const N = results.N;
  const sameMix = model.headcount.mixMode === 'same';
  const attrition = Number(model.settings.attritionPct) > 0;
  const mixCols = sameMix ? [{ index: 0, label: 'All years', year: '' }] : yrs;
  const mixProblem = hc.mixEntered.some(Boolean) && !hc.mixValid.every(Boolean);
  const [ramp, setRamp] = useState({ start: null, target: null, profile: 'linear' });

  const copyY1 = () => mutate((d) => { d.headcount.mix = d.headcount.mix.map((row) => row.map(() => (has(row[0]) ? Number(row[0]) : null))); });
  const generateRamp = () => {
    if (!has(ramp.start) || !has(ramp.target)) return;
    const a = Number(ramp.start); const b = Number(ramp.target);
    mutate((d) => {
      d.headcount.exit = results.Y.map((y) => {
        if (N === 1) return Math.round(b);
        const t = y / (N - 1);
        const shaped = ramp.profile === 'front' ? 1 - Math.pow(1 - t, 2) : ramp.profile === 'back' ? Math.pow(t, 2) : t;
        return Math.round(a + (b - a) * shaped);
      });
    });
  };

  return (
    <>
      <PageHeader step={2} eyebrow="Step 2 of 6 · Headcount" title="Headcount plan" description={`Enter the exit headcount for each of the ${N} years and the experience mix. This drives compensation, other people costs, seats, parking, devices and every per-employee cost.`} currency={currency} />
      {mixProblem && <Callout tone="danger" icon="alert" title="Experience mix must total 100% for every year.">Costing uses the mix as entered, so an invalid total under- or over-states people cost.</Callout>}

      <Panel title="Ramp helper (optional)" subtitle="Generate the exit headcount from a starting size, a target size and a growth profile. You can still edit every year afterwards.">
        <div className="helper-row">
          <Field label="Year 1 exit headcount"><NumField value={ramp.start} onChange={(v) => setRamp({ ...ramp, start: v })} decimals={0} size="wide" placeholder="e.g. 40" /></Field>
          <Field label={`Year ${N} exit headcount`}><NumField value={ramp.target} onChange={(v) => setRamp({ ...ramp, target: v })} decimals={0} size="wide" placeholder="e.g. 300" /></Field>
          <Field label="Growth profile">
            <select value={ramp.profile} onChange={(e) => setRamp({ ...ramp, profile: e.target.value })}>
              <option value="linear">Linear (steady growth)</option>
              <option value="front">Front-loaded (fast start, then plateau)</option>
              <option value="back">Back-loaded (slow start, then acceleration)</option>
            </select>
          </Field>
          <button type="button" className="btn primary" onClick={generateRamp} disabled={!has(ramp.start) || !has(ramp.target)}>Generate ramp</button>
        </div>
      </Panel>

      <div className="grid grid-2-1">
        <Panel title="Overall headcount ramp-up" subtitle="Enter the expected exit headcount at the end of each year. Other values are calculated automatically." tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Metric</th><YearHeaders years={yrs} /></tr></thead>
              <tbody>
                <tr>
                  <td><span className="name">Exit headcount (input)</span><span className="sub">FTE at year end</span></td>
                  {yrs.map((y) => <td key={y.index} className="num"><NumField value={model.headcount.exit[y.index]} onChange={(v) => update(['headcount', 'exit', y.index], v === null ? null : Math.round(v))} decimals={0} size="narrow" ariaLabel={`Exit headcount ${y.label}`} /></td>)}
                </tr>
                <tr><td className="computed"><span className="name">Opening headcount</span></td>{hc.opening.map((v, i) => <td key={i} className="num computed">{int(v)}</td>)}</tr>
                <tr><td className="computed"><span className="name">Net addition (new hires)</span></td>{hc.netAdd.map((v, i) => <td key={i} className={`num computed ${v < 0 ? 'bad' : ''}`}>{int(v)}</td>)}</tr>
                {attrition && <tr><td className="computed"><span className="name">Backfill hires (attrition)</span><span className="sub">{model.settings.attritionPct}% of opening headcount</span></td>{hc.hires.map((v, i) => <td key={i} className="num computed">{r1(v - Math.max(hc.netAdd[i], 0))}</td>)}</tr>}
                <tr className="total"><td><span className="name">Average headcount (for costing)</span><span className="sub">(opening + exit) ÷ 2</span></td>{hc.average.map((v, i) => <td key={i} className="num">{r1(v)}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Headcount ramp-up" subtitle="Exit headcount with the average used for costing.">
          {hc.entered ? <Columns name="Exit headcount" data={yrs.map((y) => ({ label: y.label, sub: String(y.year), value: hc.exit[y.index] }))} color="#2a78d6" format={int} line={{ name: 'Average headcount', color: '#0b1f3a', values: hc.average }} height={250} /> : <div className="empty">Enter the exit headcount to see the ramp.</div>}
        </Panel>
      </div>

      <div className="grid grid-2-1">
        <Panel title="Experience mix by year" subtitle="Share of headcount in each experience band. Totals must equal 100%." tight
          actions={<><span className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Mix mode</span><Segmented options={[{ value: 'same', label: 'Same across all years' }, { value: 'byYear', label: 'Customize by year' }]} value={model.headcount.mixMode} onChange={(v) => update(['headcount', 'mixMode'], v)} />{!sameMix && <button type="button" className="btn sm" onClick={copyY1}>Copy Y1 to all years</button>}</>}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Experience band</th>{mixCols.map((y) => <th key={y.index} className="num">{y.label}<small>{y.year}</small></th>)}</tr></thead>
              <tbody>
                {BANDS.map((b, bi) => (
                  <tr key={b.id}>
                    <td><Swatch color={BAND_COLORS[bi]} round /><span className="name" style={{ display: 'inline' }}>{b.name}</span><span className="sub">{b.roles}</span></td>
                    {mixCols.map((y) => <td key={y.index} className="num"><NumField value={model.headcount.mix[bi][y.index]} onChange={(v) => update(['headcount', 'mix', bi, y.index], v)} suffix="%" size="narrow" decimals={1} ariaLabel={`${b.name} mix ${y.label}`} /></td>)}
                  </tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  {mixCols.map((y) => <td key={y.index} className="num">{hc.mixEntered[y.index] ? <StatusCheck ok={hc.mixValid[y.index]} okText={pct(hc.mixTotal[y.index], 0)} errText={pct(hc.mixTotal[y.index], 0)} /> : <span className="muted">—</span>}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Experience mix trend" subtitle="Stacked share of headcount by experience band.">
          {hc.mixEntered.some(Boolean) ? <Stacked100 data={yrs.map((y) => ({ label: y.label, sub: String(y.year), values: BANDS.map((_, bi) => hc.mix[bi][y.index]) }))} series={bandSeries} height={300} /> : <div className="empty">Enter the experience mix to see the trend.</div>}
        </Panel>
      </div>

      <div className="grid grid-2-1">
        <Panel title="Experience-wise headcount (average FTE for costing)" subtitle="Average headcount × experience mix for each year. These FTEs drive every per-employee cost." tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Experience band</th>{yrs.map((y) => <th key={y.index} className="num">{y.label}<small>Avg HC {r1(hc.average[y.index])}</small></th>)}</tr></thead>
              <tbody>
                {BANDS.map((b, bi) => <tr key={b.id}><td><Swatch color={BAND_COLORS[bi]} round />{b.name}</td>{yrs.map((y) => <td key={y.index} className="num">{r1(hc.bandAvg[bi][y.index])}</td>)}</tr>)}
                <tr className="total"><td>Total</td>{yrs.map((y) => <td key={y.index} className="num">{r1(hc.average[y.index])}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={`Year ${N} experience pyramid (exit headcount)`} subtitle={`Total exit headcount ${int(hc.exit[results.L])}`}>
          {hc.exit[results.L] > 0 && hc.mixEntered[results.L] ? <Pyramid rows={BANDS.map((b, bi) => ({ name: b.name, color: BAND_COLORS[bi], ink: bi < 2 ? '#0b1f3a' : '#fff', value: hc.bandExit[bi][results.L] }))} format={(v) => int(v)} /> : <div className="empty">Enter headcount and mix for the final year.</div>}
        </Panel>
      </div>
      <StepNav nav={nav} go={go} />
    </>
  );
}

export function HeadcountSummary({ model, results, currency }) {
  const hc = results.headcount;
  const yrs = results.years;
  const L = results.L; const N = results.N;
  const growth = hc.exit[0] ? ((hc.exit[L] - hc.exit[0]) / hc.exit[0]) * 100 : 0;
  const seniorShare = hc.exit[L] ? ((hc.bandExit[3][L] + hc.bandExit[4][L]) / hc.exit[L]) * 100 : 0;
  const totalHires = hc.hires.reduce((t, v) => t + v, 0);
  const seatsPct = model.realEstate.type ? model.realEstate[model.realEstate.type].seatsPct : null;
  const ratio = model.realEstate.type ? model.realEstate[model.realEstate.type].parkingRatio : null;
  return (
    <>
      <PageHeader icon="people" eyebrow="Output · Headcount" title="Headcount summary" description={`${N}-year view of the headcount ramp, hiring volume and the experience mix that drives every per-employee cost.`} currency={currency} />
      {!hc.entered && <Callout tone="warn" icon="alert" title="No headcount entered yet.">Complete step 2 to populate this summary.</Callout>}
      <div className="kpis">
        <Kpi icon="people" label={`Total headcount (Year ${N})`} value={int(hc.exit[L])} delta={{ good: growth >= 0, text: signedPct(growth) }} sub={`vs Year 1 (${int(hc.exit[0])})`} />
        <Kpi icon="user" label={`Total hires (${N} years)`} value={int(totalHires)} sub={Number(model.settings.attritionPct) > 0 ? `incl. ${model.settings.attritionPct}% attrition backfill` : 'Net additions'} />
        <Kpi icon="trend" label={`Average headcount (${N} years)`} value={int(results.totals.avgHeadcount)} sub="Basis for annual costs" />
        <Kpi icon="layers" label={`Senior share (Year ${N})`} value={pct(seniorShare, 0)} sub="10+ years of experience" />
      </div>
      <div className="grid grid-2">
        <Panel title="Headcount ramp-up (total)" subtitle="Exit headcount by year with the costing average.">
          <Columns name="Exit headcount" data={yrs.map((y) => ({ label: y.label, sub: String(y.year), value: hc.exit[y.index] }))} color="#2a78d6" format={int} line={{ name: 'Average headcount', color: '#0b1f3a', values: hc.average }} height={260} />
        </Panel>
        <Panel title="Headcount by experience band (exit FTE)" subtitle="Stacked by experience band at year end.">
          <StackedColumns data={yrs.map((y) => ({ label: y.label, sub: String(y.year), values: BANDS.map((_, bi) => hc.bandExit[bi][y.index]) }))} series={bandSeries} format={int} height={260} />
        </Panel>
      </div>
      <div className="grid grid-2">
        <Panel title="Experience mix – headcount (exit FTE)" tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Experience band</th><YearHeaders years={yrs} /></tr></thead>
              <tbody>
                {BANDS.map((b, bi) => <tr key={b.id}><td><Swatch color={BAND_COLORS[bi]} round />{b.name}</td>{yrs.map((y) => <td key={y.index} className="num">{int(hc.bandExit[bi][y.index])}</td>)}</tr>)}
                <tr className="total"><td>Total headcount</td>{yrs.map((y) => <td key={y.index} className="num">{int(hc.exit[y.index])}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Hiring plan" tight>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Metric</th><YearHeaders years={yrs} extra={['Total']} /></tr></thead>
              <tbody>
                <tr><td>Opening headcount</td>{hc.opening.map((v, i) => <td key={i} className="num">{int(v)}</td>)}<td className="num muted">—</td></tr>
                <tr><td>Net additions</td>{hc.netAdd.map((v, i) => <td key={i} className="num">{int(v)}</td>)}<td className="num">{int(hc.netAdd.reduce((t, v) => t + v, 0))}</td></tr>
                <tr><td>Backfill hires (attrition)</td>{hc.hires.map((v, i) => <td key={i} className="num">{r1(v - Math.max(hc.netAdd[i], 0))}</td>)}<td className="num">{r1(totalHires - hc.netAdd.reduce((t, v) => t + Math.max(v, 0), 0))}</td></tr>
                <tr className="subtotal"><td>Total hires</td>{hc.hires.map((v, i) => <td key={i} className="num">{r1(v)}</td>)}<td className="num">{r1(totalHires)}</td></tr>
                <tr className="total"><td>Exit headcount</td>{hc.exit.map((v, i) => <td key={i} className="num">{int(v)}</td>)}<td className="num muted">—</td></tr>
                {seatsPct !== null && <tr><td>Seats required ({seatsPct ?? '—'}%)</td>{hc.seats.map((v, i) => <td key={i} className="num">{int(v)}</td>)}<td className="num muted">—</td></tr>}
                {ratio !== undefined && ratio !== null && <tr><td>Parking bays (1:{ratio})</td>{hc.bays.map((v, i) => <td key={i} className="num">{int(v)}</td>)}<td className="num muted">—</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
