// Builds a PowerPoint pitch deck from the live case using pptxgenjs.
import PptxGenJS from 'pptxgenjs';
import { BANDS, REAL_ESTATE_TYPES, FX, BENCHMARK_LIBRARY, DEFAULT_LIBRARY, librarySources } from './defaults.js';
import { compute, computeSensitivity } from './engine.js';
import { money, int, pct, signedPct } from './format.js';
import { validateModel, summarizeChecks } from './validate.js';

const C = { navy: '0B1F3A', blue: '1F6FD1', orange: 'F5891F', ink: '14243A', ink2: '44546A', muted: '7B8A9B', line: 'E3E8EE', soft: 'E8F1FC', white: 'FFFFFF' };
const CAT_COLORS = ['2A78D6', 'EB6834', '1BAF7A', 'EDA100', 'E87BA4', '008300'];
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

async function loadLogo() {
  try {
    const res = await fetch(`${import.meta.env?.BASE_URL ?? "/"}logo.png`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => resolve(null); r.readAsDataURL(blob); });
  } catch { return null; }
}

export async function buildDeck({ model, results, workspace }) {
  const cur = model.settings.currency;
  const s = model.settings;
  const N = results.N; const L = results.L;
  const yrs = results.years;
  const m = (v) => money(v, cur, { compact: true });
  const full = (v) => money(v, cur);
  const labels = yrs.map((y) => `${y.label} ${y.year}`);
  const logo = await loadLogo();
  const title = s.gccName || s.companyName || 'GCC Business Case';

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 in
  pptx.author = 'Future Factor 360'; pptx.company = 'Future Factor 360'; pptx.title = `${title} – Business Case`;
  const masterObjects = [
    { rect: { x: 0, y: 0, w: '100%', h: 0.09, fill: { color: C.blue } } },
    { text: { text: `${title} · GCC Business Case · ${s.currency} constant · ${N}-year model`, options: { x: 0.45, y: 7.05, w: 9, h: 0.3, fontSize: 9, color: C.muted, fontFace: 'Calibri' } } },
    { text: { text: 'Prepared with Future Factor 360 GCC Business Case Builder', options: { x: 8.5, y: 7.05, w: 4.4, h: 0.3, fontSize: 9, color: C.muted, align: 'right', fontFace: 'Calibri' } } },
  ];
  if (logo) masterObjects.push({ image: { x: 11.55, y: 0.28, w: 1.4, h: 0.44, data: logo } });
  pptx.defineSlideMaster({ title: 'FF', background: { color: C.white }, objects: masterObjects });

  const heading = (slide, text, sub) => {
    slide.addText(text, { x: 0.45, y: 0.3, w: 10.8, h: 0.55, fontSize: 24, bold: true, color: C.navy, fontFace: 'Calibri' });
    if (sub) slide.addText(sub, { x: 0.45, y: 0.82, w: 11, h: 0.35, fontSize: 12, color: C.ink2, fontFace: 'Calibri' });
  };
  const tile = (slide, x, y, w, label, value, sub) => {
    slide.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 1.15, fill: { color: C.soft }, line: { color: C.soft }, rectRadius: 0.08 });
    slide.addText(label, { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: 0.3, fontSize: 10, color: C.ink2, fontFace: 'Calibri' });
    slide.addText(value, { x: x + 0.15, y: y + 0.36, w: w - 0.3, h: 0.5, fontSize: 22, bold: true, color: C.navy, fontFace: 'Calibri' });
    if (sub) slide.addText(sub, { x: x + 0.15, y: y + 0.82, w: w - 0.3, h: 0.28, fontSize: 9, color: C.muted, fontFace: 'Calibri' });
  };
  const cell = (text, opts = {}) => ({ text: String(text), options: { fontSize: 9, color: C.ink, fontFace: 'Calibri', valign: 'middle', ...opts } });
  const head = (text, opts = {}) => cell(text, { bold: true, color: C.ink2, fill: { color: 'F6F8FB' }, fontSize: 8.5, ...opts });
  const num = (text, opts = {}) => cell(text, { align: 'right', ...opts });
  const table = (slide, rows, x, y, w, colW) => slide.addTable(rows, { x, y, w, colW, border: { type: 'solid', color: C.line, pt: 0.5 }, rowH: 0.26, autoPage: false, fontFace: 'Calibri' });
  const barChart = (slide, series, x, y, w, h, opts = {}) => slide.addChart(pptx.ChartType.bar, series.map((sr) => ({ name: sr.name, labels, values: sr.values.map((v) => Math.round(v)) })), {
    x, y, w, h, barDir: 'col', barGrouping: opts.stacked === false ? 'clustered' : 'stacked', chartColors: opts.colors || CAT_COLORS, showLegend: series.length > 1, legendPos: 'b', legendFontSize: 9,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, valAxisLabelFormatCode: '#,##0', valGridLine: { color: 'E9EDF2', size: 0.5 }, catGridLine: { style: 'none' }, dataLabelFontSize: 8, showValue: false, barGapWidthPct: 60, ...opts.extra,
  });

  // 1. Title
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0.09, w: 5.2, h: 7.41, fill: { color: C.navy }, line: { color: C.navy } });
    sl.addText('GCC BUSINESS CASE', { x: 0.5, y: 2.2, w: 4.4, h: 0.4, fontSize: 12, bold: true, color: '8FD3F4', charSpacing: 3, fontFace: 'Calibri' });
    sl.addText(title, { x: 0.5, y: 2.65, w: 4.4, h: 1.6, fontSize: 30, bold: true, color: C.white, fontFace: 'Calibri', valign: 'top' });
    sl.addText([s.companyName, [s.city, s.country].filter(Boolean).join(', ')].filter(Boolean).join(' · '), { x: 0.5, y: 4.3, w: 4.4, h: 0.5, fontSize: 13, color: 'B7C8DC', fontFace: 'Calibri' });
    sl.addText(`${N}-year model · ${yrs[0].year}–${yrs[L].year} · ${cur} (constant)`, { x: 0.5, y: 4.8, w: 4.4, h: 0.4, fontSize: 12, color: 'B7C8DC', fontFace: 'Calibri' });
    sl.addText(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), { x: 0.5, y: 6.4, w: 4.4, h: 0.4, fontSize: 11, color: '8FA9C8', fontFace: 'Calibri' });
    tile(sl, 5.8, 1.6, 3.4, `${N}-year total cost`, m(results.totals.fiveYear), 'Operating + one-time');
    tile(sl, 9.4, 1.6, 3.4, `Year ${N} run-rate`, m(results.totals.runRate), 'Annual cost at scale');
    tile(sl, 5.8, 2.95, 3.4, `Year ${N} headcount`, int(results.totals.finalHeadcount), `Average ${int(results.totals.avgHeadcount)} over ${N} years`);
    tile(sl, 9.4, 2.95, 3.4, `Year ${N} cost per FTE`, full(results.totals.finalCostPerFte), 'All-in unit cost');
    if (s.objective) sl.addText(`Objective: ${s.objective}`, { x: 5.8, y: 4.4, w: 7, h: 0.4, fontSize: 12, bold: true, color: C.navy, fontFace: 'Calibri' });
    if (s.plan) sl.addText(s.plan, { x: 5.8, y: 4.8, w: 7, h: 1.9, fontSize: 11, color: C.ink2, fontFace: 'Calibri', valign: 'top' });
  }

  // 2. Executive summary
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    heading(sl, 'Executive summary', `Consolidated ${N}-year economics for ${title}`);
    const t = results.totals;
    const fteChange = t.costPerFte[0] ? ((t.finalCostPerFte - t.costPerFte[0]) / t.costPerFte[0]) * 100 : 0;
    tile(sl, 0.45, 1.3, 2.45, `${N}-year total cost`, m(t.fiveYear), 'Operating + one-time');
    tile(sl, 3.05, 1.3, 2.45, 'Average annual cost', m(t.avgAnnual), 'Across the horizon');
    tile(sl, 5.65, 1.3, 2.45, `Year ${N} run-rate`, m(t.runRate), 'Annual cost at scale');
    tile(sl, 8.25, 1.3, 2.45, `Year ${N} cost per FTE`, full(t.finalCostPerFte), `${signedPct(fteChange)} vs Year 1`);
    tile(sl, 10.85, 1.3, 2.0, `Year ${N} headcount`, int(t.finalHeadcount), `Avg ${int(t.avgHeadcount)}`);
    barChart(sl, results.categories.map((c) => ({ name: c.short, values: c.values })), 0.45, 2.7, 7.4, 4.2);
    sl.addChart(pptx.ChartType.doughnut, [{ name: 'Composition', labels: results.categories.map((c) => c.short), values: results.categories.map((c) => Math.round(c.total)) }], { x: 8.1, y: 2.7, w: 4.8, h: 4.2, chartColors: CAT_COLORS, holeSize: 55, showLegend: true, legendPos: 'r', legendFontSize: 9, showPercent: true, dataLabelFontSize: 8, showTitle: true, title: `${N}-year composition`, titleFontSize: 11, titleColor: C.navy });
  }

  // 3. The plan
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    heading(sl, 'The plan', 'What the center is for, where it will be and how it is set up');
    const rows = [
      [head('Item'), head('Detail')],
      [cell('Company'), cell(s.companyName || '—')], [cell('Center'), cell(s.gccName || '—')], [cell('Objective'), cell(s.objective || '—')],
      [cell('Location'), cell([s.city, s.country].filter(Boolean).join(', ') || '—')], [cell('Horizon'), cell(`${N} years (${yrs[0].year}–${yrs[L].year})`)], [cell('Currency'), cell(`${cur}, constant prices${cur !== 'USD' ? ` (benchmarks converted at ECB rates, ${FX.asOf})` : ''}`)],
      [cell('Real estate strategy'), cell(results.realEstate.typeName + (model.realEstate.description ? ` — ${model.realEstate.description}` : ''))],
      [cell('Attrition backfill'), cell(has(s.attritionPct) ? `${s.attritionPct}% of opening headcount rehired each year` : 'Not modelled')],
    ];
    table(sl, rows, 0.45, 1.35, 12.4, [2.4, 10.0]);
    if (s.plan) sl.addText(s.plan, { x: 0.45, y: 4.3, w: 12.4, h: 2.5, fontSize: 12, color: C.ink, fontFace: 'Calibri', valign: 'top', fill: { color: 'F6F8FB' }, margin: 10 });
  }

  // 4. Headcount
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const hc = results.headcount;
    heading(sl, 'Headcount plan', `From ${int(hc.exit[0])} to ${int(hc.exit[L])} people over ${N} years · ${int(hc.hires.reduce((a, b) => a + b, 0))} total hires`);
    barChart(sl, [{ name: 'Exit headcount', values: hc.exit }], 0.45, 1.3, 6.2, 3.3, { colors: ['2A78D6'], extra: { showValue: true } });
    table(sl, [
      [head('Metric'), ...labels.map((l) => head(l, { align: 'right' }))],
      [cell('Exit headcount'), ...hc.exit.map((v) => num(int(v)))],
      [cell('Average headcount'), ...hc.average.map((v) => num((Math.round(v * 10) / 10).toString()))],
      [cell('New hires'), ...hc.hires.map((v) => num(int(v)))],
      [cell('Seats'), ...hc.seats.map((v) => num(int(v)))],
    ], 6.9, 1.3, 6.0, [1.7, ...labels.map(() => 4.3 / N)]);
    table(sl, [
      [head('Experience band'), ...labels.map((l) => head(l, { align: 'right' })), head('Illustrative roles')],
      ...BANDS.map((b, bi) => [cell(b.name), ...yrs.map((y) => num(`${Math.round(hc.mix[bi][y.index])}% · ${int(hc.bandExit[bi][y.index])}`)), cell(b.roles, { color: C.muted })]),
    ], 0.45, 4.85, 12.4, [1.8, ...labels.map(() => 7.4 / N), 3.2]);
  }

  // 5. Compensation
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const comp = results.compensation;
    heading(sl, 'Compensation', `${m(comp.fiveYear)} over ${N} years · fully loaded cost per FTE by band (Year 1)`);
    table(sl, [
      [head('Band'), head('Base', { align: 'right' }), head('Variable', { align: 'right' }), head('Allowances', { align: 'right' }), head('Benefits', { align: 'right' }), head('Cost / FTE', { align: 'right' }), head('Industry avg base', { align: 'right' })],
      ...BANDS.map((b, i) => { const p = comp.perBand[i][0]; const avg = model.benchmarks?.[`compensation.bands.${i}.base`]; return [cell(b.name), num(full(p.base)), num(full(p.variable)), num(full(p.allowances)), num(full(p.benefits)), num(full(p.perFte), { bold: true }), num(has(avg) ? full(avg) : '—', { color: C.muted })]; }),
    ], 0.45, 1.3, 7.2, [1.6, 1.0, 0.95, 1.0, 0.95, 1.0, 0.7]);
    const series = [['base', 'Base salary'], ['variable', 'Variable pay'], ['allowances', 'Allowances'], ['benefits', 'Benefits']].map(([k, name]) => ({ name, values: comp.byComponent[k] }));
    barChart(sl, series, 7.9, 1.3, 5.0, 3.4, { colors: ['2A78D6', 'EB6834', '1BAF7A', 'EDA100'] });
    const benefits = model.compensation.benefits.filter((b) => has(b.value)).map((b) => `${b.name}: ${b.type === 'pctOfBasic' ? `${b.value}% of basic` : full(b.value) + ' per employee'}`);
    sl.addText([{ text: 'Benefit assumptions', options: { bold: true, color: C.navy, breakLine: true } }, ...benefits.map((b) => ({ text: `• ${b}`, options: { breakLine: true } }))], { x: 0.45, y: 4.2, w: 7.2, h: 2.6, fontSize: 10, color: C.ink2, fontFace: 'Calibri', valign: 'top' });
    sl.addText(`Mode: ${model.compensation.mode === 'escalate' ? `annual escalation ${model.compensation.escalation ?? 0}%` : model.compensation.mode === 'byYear' ? 'customised by year' : 'same unit costs across all years'} · basic salary ${model.compensation.basicPct ?? '—'}% of base`, { x: 7.9, y: 4.9, w: 5, h: 0.8, fontSize: 10, color: C.ink2, fontFace: 'Calibri' });
  }

  // 6. Other people costs + corporate
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const op = results.otherPeople;
    heading(sl, 'Other people and center operations', `${m(op.fiveYear)} other people costs · ${m(results.corporate.fiveYear)} corporate costs · ${m(results.establishment.total)} one-time establishment`);
    table(sl, [
      [head('Other people costs'), ...labels.map((l) => head(l, { align: 'right' })), head('Total', { align: 'right' })],
      [cell('Hiring & onboarding'), ...op.subtotals.hiring.map((v) => num(m(v))), num(m(op.subtotals.hiring.reduce((a, b) => a + b, 0)), { bold: true })],
      [cell('Employee-related operating'), ...op.subtotals.operating.map((v) => num(m(v))), num(m(op.subtotals.operating.reduce((a, b) => a + b, 0)), { bold: true })],
      [cell('Center-level people costs'), ...op.subtotals.center.map((v) => num(m(v))), num(m(op.subtotals.center.reduce((a, b) => a + b, 0)), { bold: true })],
      [cell('Total', { bold: true }), ...op.total.map((v) => num(m(v), { bold: true })), num(m(op.fiveYear), { bold: true })],
    ], 0.45, 1.3, 12.4, [2.6, ...labels.map(() => 8.3 / N), 1.5]);
    table(sl, [
      [head('Corporate costs'), ...labels.map((l) => head(l, { align: 'right' })), head('Total', { align: 'right' })],
      ...results.corporate.rows.map((r) => [cell(r.name), ...r.values.map((v) => num(m(v))), num(m(r.values.reduce((a, b) => a + b, 0)), { bold: true })]),
      [cell('Total', { bold: true }), ...results.corporate.total.map((v) => num(m(v), { bold: true })), num(m(results.corporate.fiveYear), { bold: true })],
    ], 0.45, 3.1, 12.4, [2.6, ...labels.map(() => 8.3 / N), 1.5]);
    table(sl, [
      [head('One-time establishment (Year 1)'), head('Amount', { align: 'right' })],
      ...results.establishment.items.map((it) => [cell(it.name), num(full(it.value))]),
      [cell('Total', { bold: true }), num(full(results.establishment.total), { bold: true })],
    ], 0.45, 5.35, 5.6, [4.1, 1.5]);
  }

  // 7. Real estate
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const re = results.realEstate;
    const def = REAL_ESTATE_TYPES.find((x) => x.key === model.realEstate.type);
    heading(sl, `Real estate – ${re.typeName}`, def ? def.tagline : 'No type of space selected');
    barChart(sl, [['space', 'Space'], ['operating', 'Operating'], ['parking', 'Parking'], ['setup', 'Fit-out / setup']].map(([k, name]) => ({ name, values: re[k] })), 0.45, 1.3, 6.4, 3.6, { colors: ['2A78D6', 'EB6834', '1BAF7A', 'EDA100'] });
    if (def) {
      const vals = model.realEstate[model.realEstate.type];
      table(sl, [[head('Assumption'), head('Input', { align: 'right' }), head('Industry avg', { align: 'right' })], ...def.fields.map((f) => { const v = vals[f.key]; const a = model.benchmarks?.[`realEstate.${model.realEstate.type}.${f.key}`]; const fmt = (x) => (!has(x) ? '—' : f.prefix === 'currency' ? money(x, cur, { decimals: x < 100 && !Number.isInteger(x) ? 2 : 0 }) : f.key === 'parkingRatio' ? `1 : ${x}` : `${x}${f.suffix || ''}`); return [cell(`${f.name} (${f.unit.replace('currency', cur)})`), num(fmt(v)), num(fmt(a), { color: C.muted })]; })], 7.1, 1.3, 5.8, [3.6, 1.1, 1.1]);
    }
    table(sl, [
      [head('Real estate cost'), ...labels.map((l) => head(l, { align: 'right' })), head('Total', { align: 'right' })],
      [cell('Space (rent / seat fees)'), ...re.space.map((v) => num(m(v))), num(m(re.space.reduce((a, b) => a + b, 0)))],
      [cell('Operating, parking, setup'), ...yrs.map((y) => num(m(re.operating[y.index] + re.parking[y.index] + re.setup[y.index]))), num(m(re.fiveYear - re.space.reduce((a, b) => a + b, 0)))],
      [cell('Total', { bold: true }), ...re.total.map((v) => num(m(v), { bold: true })), num(m(re.fiveYear), { bold: true })],
      [cell('Security deposits (cash, refundable)', { color: C.muted }), ...re.deposit.map((v) => num(m(v), { color: C.muted })), num(m(re.depositTotal), { color: C.muted })],
      [cell('Seats'), ...results.headcount.seats.map((v) => num(int(v))), num('')],
    ], 0.45, 5.1, 12.4, [2.9, ...labels.map(() => 8.0 / N), 1.5]);
  }

  // 8. Technology
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const tech = results.technology;
    heading(sl, 'Technology', `${m(tech.fiveYear)} over ${N} years · ${int(tech.devicesBought.reduce((a, b) => a + b, 0))} devices incl. refresh`);
    barChart(sl, [{ name: 'Recurring services', values: tech.recurring }, { name: 'Devices', values: tech.devices }], 0.45, 1.3, 5.6, 3.6, { colors: ['2A78D6', 'EB6834'] });
    table(sl, [
      [head('Component'), ...labels.map((l) => head(l, { align: 'right' })), head('Total', { align: 'right' })],
      ...tech.rows.map((r) => [cell(r.name), ...r.values.map((v) => num(m(v))), num(m(r.values.reduce((a, b) => a + b, 0)))]),
      [cell('End-user devices'), ...tech.devices.map((v) => num(m(v))), num(m(tech.devices.reduce((a, b) => a + b, 0)))],
      [cell('Total', { bold: true }), ...tech.total.map((v) => num(m(v), { bold: true })), num(m(tech.fiveYear), { bold: true })],
    ], 6.3, 1.3, 6.6, [2.2, ...labels.map(() => 3.4 / N), 1.0]);
  }

  // 9. Consolidated results
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const t = results.totals;
    heading(sl, 'Consolidated results', `Annual cost by category · ${m(t.fiveYear)} over ${N} years`);
    barChart(sl, results.categories.map((c) => ({ name: c.short, values: c.values })), 0.45, 1.3, 6.4, 3.4);
    barChart(sl, [{ name: 'Cost per FTE', values: t.costPerFte }], 7.1, 1.3, 5.8, 3.4, { colors: ['1F6FD1'], extra: { showValue: true, showTitle: true, title: 'All-in cost per FTE', titleFontSize: 11, titleColor: C.navy } });
    table(sl, [
      [head('Cost category'), ...labels.map((l) => head(l, { align: 'right' })), head('Total', { align: 'right' }), head('%', { align: 'right' })],
      ...results.categories.map((c) => [cell(c.name), ...c.values.map((v) => num(m(v))), num(m(c.total), { bold: true }), num(pct(t.fiveYear ? (c.total / t.fiveYear) * 100 : 0, 0), { color: C.muted })]),
      [cell('Total', { bold: true }), ...t.byYear.map((v) => num(m(v), { bold: true })), num(m(t.fiveYear), { bold: true }), num('100%')],
      [cell('Cost per FTE', { color: C.muted }), ...t.costPerFte.map((v) => num(full(v), { color: C.muted })), num(full(t.avgCostPerFte), { color: C.muted }), num('')],
    ], 0.45, 4.85, 12.4, [2.5, ...labels.map(() => 7.7 / N), 1.4, 0.8]);
  }

  // 10. Cash flow
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const cf = results.cashflow;
    heading(sl, 'Cash flow', `${m(cf.cumulative[L])} cumulative cash out including ${m(cf.depositTotal)} refundable deposits`);
    barChart(sl, [{ name: 'Operating', values: cf.operating }, { name: 'One-time', values: cf.oneTime }, { name: 'Deposits', values: cf.deposits }], 0.45, 1.3, 6.4, 3.4, { colors: ['2A78D6', 'EB6834', '1BAF7A'] });
    sl.addChart(pptx.ChartType.line, [{ name: 'Cumulative cash out', labels, values: cf.cumulative.map((v) => Math.round(v)) }], { x: 7.1, y: 1.3, w: 5.8, h: 3.4, chartColors: ['1F6FD1'], lineSize: 2, lineDataSymbolSize: 6, showLegend: false, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, valAxisLabelFormatCode: '#,##0', valGridLine: { color: 'E9EDF2', size: 0.5 }, showTitle: true, title: 'Cumulative cash out', titleFontSize: 11, titleColor: C.navy });
    table(sl, [
      [head('Line'), ...labels.map((l) => head(l, { align: 'right' })), head('Total', { align: 'right' })],
      [cell('Operating costs'), ...cf.operating.map((v) => num(m(v))), num(m(cf.operating.reduce((a, b) => a + b, 0)))],
      [cell('One-time costs'), ...cf.oneTime.map((v) => num(m(v))), num(m(cf.oneTime.reduce((a, b) => a + b, 0)))],
      [cell('Security deposits'), ...cf.deposits.map((v) => num(m(v))), num(m(cf.depositTotal))],
      [cell('Total cash out', { bold: true }), ...cf.totalOut.map((v) => num(m(v), { bold: true })), num(m(cf.totalOut.reduce((a, b) => a + b, 0)), { bold: true })],
      [cell('Cumulative'), ...cf.cumulative.map((v) => num(m(v))), num('')],
    ], 0.45, 4.85, 12.4, [2.5, ...labels.map(() => 8.4 / N), 1.5]);
  }

  // 11. Sensitivity + scenarios
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    heading(sl, 'Sensitivity and scenarios', `How the ${N}-year total moves when each driver is flexed, and how saved scenarios compare`);
    const rows = computeSensitivity(model, results).sort((a, b) => Math.abs(b.upFiveYear) - Math.abs(a.upFiveYear));
    sl.addChart(pptx.ChartType.bar, [{ name: 'Driver increased', labels: rows.map((r) => `${r.name} ±${r.flex}%`), values: rows.map((r) => Math.round(r.upFiveYear)) }, { name: 'Driver decreased', labels: rows.map((r) => `${r.name} ±${r.flex}%`), values: rows.map((r) => Math.round(r.downFiveYear)) }], { x: 0.45, y: 1.3, w: 6.4, h: 3.6, barDir: 'bar', barGrouping: 'clustered', chartColors: ['2A78D6', '86B6EF'], showLegend: true, legendPos: 'b', legendFontSize: 9, catAxisLabelFontSize: 9, valAxisLabelFontSize: 9, valAxisLabelFormatCode: '#,##0', valGridLine: { color: 'E9EDF2', size: 0.5 } });
    table(sl, [[head('Driver'), head('Flex', { align: 'right' }), head(`Δ ${N}-yr total (+)`, { align: 'right' }), head('Impact', { align: 'right' })], ...rows.map((r) => [cell(r.name), num(`±${r.flex}%`), num(m(r.upFiveYear)), num(signedPct(r.upPct, 1), { bold: true })])], 7.1, 1.3, 5.8, [2.6, 0.8, 1.4, 1.0]);
    const scenarios = (workspace?.scenarios || []).slice(0, 4).map((sc) => ({ name: sc.name, r: compute(sc.model) }));
    if (scenarios.length > 1) {
      table(sl, [
        [head('Scenario'), head('Horizon', { align: 'right' }), head('Final headcount', { align: 'right' }), head('Total cost', { align: 'right' }), head('Final run-rate', { align: 'right' }), head('Final cost / FTE', { align: 'right' })],
        ...scenarios.map((sc) => [cell(sc.name), num(`${sc.r.N} yrs`), num(int(sc.r.totals.finalHeadcount)), num(money(sc.r.totals.fiveYear, sc.r.years ? cur : cur, { compact: true })), num(m(sc.r.totals.runRate)), num(full(sc.r.totals.finalCostPerFte))]),
      ], 0.45, 5.1, 12.4, [3.4, 1.4, 1.8, 1.9, 1.9, 2.0]);
    } else {
      sl.addText('Only the base case is saved. Create alternative scenarios in the app to compare them here.', { x: 0.45, y: 5.2, w: 12.4, h: 0.5, fontSize: 11, color: C.muted, fontFace: 'Calibri' });
    }
  }

  // 12. Benchmarks and sources
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const lib = BENCHMARK_LIBRARY[DEFAULT_LIBRARY];
    heading(sl, 'Industry averages and sources', `Inputs positioned against India GCC market references (researched ${lib.asOf}${cur !== 'USD' ? `, converted to ${cur} at ECB rates` : ''})`);
    const keyInputs = [
      ...BANDS.map((b, i) => ({ name: `Base salary · ${b.name}`, v: model.compensation.bands[i].base, k: `compensation.bands.${i}.base`, money: true })),
      { name: 'Annual salary escalation', v: model.compensation.escalation, k: 'compensation.escalation', suffix: '%' },
      ...(model.realEstate.type ? REAL_ESTATE_TYPES.find((x) => x.key === model.realEstate.type).fields.slice(0, 3).map((f) => ({ name: f.name, v: model.realEstate[model.realEstate.type][f.key], k: `realEstate.${model.realEstate.type}.${f.key}`, money: f.prefix === 'currency', suffix: f.suffix })) : []),
      { name: 'End-user device', v: model.technology.device, k: 'technology.device', money: true },
      { name: 'Collaboration licenses per user / month', v: model.technology.collab, k: 'technology.collab', money: true },
      { name: 'Recruitment agency fee per hire', v: model.otherPeople.hiring[0].value, k: 'otherPeople.hiring.agency', money: true },
      { name: 'Statutory compliance per year', v: model.corporate.items[0].base, k: 'corporate.compliance', money: true },
    ];
    const fmt = (x, it) => (!has(x) ? '—' : it.money ? money(x, cur, { decimals: x < 100 && !Number.isInteger(x) ? 2 : 0 }) : `${x}${it.suffix || ''}`);
    table(sl, [[head('Input'), head('Your input', { align: 'right' }), head('Industry average', { align: 'right' }), head('vs avg', { align: 'right' })], ...keyInputs.map((it) => { const a = model.benchmarks?.[it.k]; const d = has(it.v) && has(a) && Number(a) ? (Number(it.v) / Number(a) - 1) * 100 : null; return [cell(it.name), num(fmt(it.v, it)), num(fmt(a, it), { color: C.muted }), num(d === null ? '—' : signedPct(d, 0), { bold: true, color: d === null ? C.muted : d > 0 ? '174F9A' : '146C4D' })]; })], 0.45, 1.3, 7.0, [3.6, 1.2, 1.3, 0.9]);
    const sources = librarySources(lib).filter((x) => x.url).slice(0, 14);
    sl.addText([{ text: 'Sources', options: { bold: true, color: C.navy, breakLine: true } }, ...sources.map((src) => ({ text: `• ${src.name}`, options: { breakLine: true } }))], { x: 7.7, y: 1.3, w: 5.2, h: 5.6, fontSize: 8, color: C.ink2, fontFace: 'Calibri', valign: 'top' });
  }

  // 13. Model checks and next steps
  {
    const sl = pptx.addSlide({ masterName: 'FF' });
    const checks = validateModel(model, results);
    const sum = summarizeChecks(checks);
    heading(sl, 'Model integrity and next steps', `${sum.pass} checks passed · ${sum.warn} warnings · ${sum.fail} failures`);
    table(sl, [[head('Check'), head('Status'), head('Detail')], ...checks.map((c) => [cell(c.name), cell(c.status.toUpperCase(), { bold: true, color: c.status === 'pass' ? '146C4D' : c.status === 'fail' ? 'D03B3B' : c.status === 'warn' ? '9A6300' : C.muted }), cell(c.detail, { color: C.ink2, fontSize: 8 })])], 0.45, 1.3, 8.2, [2.6, 0.7, 4.9]);
    sl.addText([
      { text: 'Recommended next steps', options: { bold: true, color: C.navy, breakLine: true, fontSize: 12 } },
      { text: '• Validate compensation bands against a current market survey for the target roles.', options: { breakLine: true } },
      { text: '• Confirm real estate unit costs with two or three provider quotes in the shortlisted micro-markets.', options: { breakLine: true } },
      { text: '• Agree the hiring ramp and experience mix with the functional leaders who will own the center.', options: { breakLine: true } },
      { text: '• Replace planning assumptions with vendor quotes for technology, insurance and establishment items.', options: { breakLine: true } },
      { text: '• Run downside and accelerated scenarios and approve the base case for HQ review.', options: { breakLine: true } },
    ], { x: 8.9, y: 1.3, w: 4.0, h: 5.6, fontSize: 10, color: C.ink2, fontFace: 'Calibri', valign: 'top' });
  }

  const slug = (title || 'gcc-business-case').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  await pptx.writeFile({ fileName: `${slug}-business-case.pptx` });
}
