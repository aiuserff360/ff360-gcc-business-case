// Pure calculation engine. compute(model) -> results. Handles any horizon and empty (null) inputs as 0.
import { BANDS, CATEGORIES, ESTABLISHMENT_ITEMS, TECHNOLOGY_FIELDS, REAL_ESTATE_TYPES, MIN_HORIZON, MAX_HORIZON } from './defaults.js';

const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? 0 : Number(v));
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
const sum = (arr) => arr.reduce((t, v) => t + num(v), 0);
const factor = (pct, y) => Math.pow(1 + num(pct) / 100, y);

export const horizonOf = (model) => Math.min(MAX_HORIZON, Math.max(MIN_HORIZON, Math.round(num(model.settings.horizonYears) || 5)));
export const yearsOf = (model) => Array.from({ length: horizonOf(model) }, (_, i) => i);

function unitValue(mode, base, escalation, byYear, y) {
  if (mode === 'byYear') return num(has(byYear?.[y]) ? byYear[y] : base);
  if (mode === 'escalate') return num(base) * factor(escalation, y);
  return num(base);
}

export function computeHeadcount(model, Y) {
  const exit = Y.map((y) => num(model.headcount.exit?.[y]));
  const opening = Y.map((y) => (y === 0 ? 0 : exit[y - 1]));
  const netAdd = Y.map((y) => exit[y] - opening[y]);
  const attrition = num(model.settings.attritionPct) / 100;
  const hires = Y.map((y) => Math.max(netAdd[y], 0) + opening[y] * attrition);
  const average = Y.map((y) => (opening[y] + exit[y]) / 2);

  const mixRaw = BANDS.map((_, b) => Y.map((y) => {
    const row = model.headcount.mix?.[b] || [];
    return model.headcount.mixMode === 'same' ? row[0] : row[y];
  }));
  const mix = mixRaw.map((row) => row.map(num));
  const mixTotal = Y.map((y) => sum(BANDS.map((_, b) => mix[b][y])));
  const mixEntered = Y.map((y) => BANDS.some((_, b) => has(mixRaw[b][y])));
  const mixValid = mixTotal.map((t) => Math.abs(t - 100) < 0.01);
  const bandExit = BANDS.map((_, b) => Y.map((y) => exit[y] * mix[b][y] / 100));
  const bandAvg = BANDS.map((_, b) => Y.map((y) => average[y] * mix[b][y] / 100));

  const reType = model.realEstate.type;
  const re = reType ? model.realEstate[reType] || {} : {};
  const seats = Y.map((y) => Math.ceil(exit[y] * num(re.seatsPct) / 100));
  const newSeats = Y.map((y) => Math.max(seats[y] - (y ? seats[y - 1] : 0), 0));
  const bays = Y.map((y) => (num(re.parkingRatio) > 0 ? Math.ceil(exit[y] / num(re.parkingRatio)) : 0));

  return { exit, opening, netAdd, hires, average, mix, mixTotal, mixValid, mixEntered, bandExit, bandAvg, seats, newSeats, bays, entered: exit.some((v) => v > 0) };
}

export function computeCompensation(model, hc, Y) {
  const c = model.compensation;
  const basicPct = num(c.basicPct) / 100;
  const applies = (benefit, b) => benefit.applyTo === 'all' || Number(benefit.applyTo) === b;
  const perBand = BANDS.map((_, b) => {
    const band = c.bands[b];
    return Y.map((y) => {
      const base = unitValue(c.mode, band.base, band.escalation, band.baseByYear, y);
      const perEmpFactor = c.mode === 'escalate' ? factor(band.escalation, y) : 1;
      const variable = base * num(band.variablePct) / 100;
      const allowances = base * num(band.allowancePct) / 100;
      const basic = base * basicPct;
      let benefits = 0;
      c.benefits.forEach((ben) => {
        if (!applies(ben, b)) return;
        benefits += ben.type === 'pctOfBasic' ? basic * num(ben.value) / 100 : num(ben.value) * perEmpFactor;
      });
      const target = base + variable + allowances;
      return { base, variable, allowances, benefits, target, perFte: target + benefits };
    });
  });
  const component = (key) => Y.map((y) => sum(BANDS.map((_, b) => perBand[b][y][key] * hc.bandAvg[b][y])));
  const byComponent = { base: component('base'), variable: component('variable'), allowances: component('allowances'), benefits: component('benefits') };
  const byBand = BANDS.map((_, b) => Y.map((y) => perBand[b][y].perFte * hc.bandAvg[b][y]));
  const total = Y.map((y) => byBand.reduce((t, row) => t + row[y], 0));
  return { perBand, byComponent, byBand, total, fiveYear: sum(total) };
}

export function computeOtherPeople(model, hc, Y) {
  const op = model.otherPeople;
  const rowValues = (row, driver) => Y.map((y) => {
    const unit = unitValue(op.mode, row.value, op.escalation, row.byYear, y);
    const elig = row.eligibility === undefined ? 1 : num(row.eligibility) / 100;
    return unit * elig * driver[y];
  });
  const ones = Y.map(() => 1);
  const hiring = op.hiring.map((row) => ({ ...row, values: rowValues(row, hc.hires) }));
  const operating = op.operating.map((row) => ({ ...row, values: rowValues(row, hc.average) }));
  const center = op.center.map((row) => ({ ...row, values: rowValues(row, ones) }));
  const subtotal = (rows) => Y.map((y) => rows.reduce((t, r) => t + r.values[y], 0));
  const subtotals = { hiring: subtotal(hiring), operating: subtotal(operating), center: subtotal(center) };
  const total = Y.map((y) => subtotals.hiring[y] + subtotals.operating[y] + subtotals.center[y]);
  return { hiring, operating, center, subtotals, total, fiveYear: sum(total) };
}

export function computeCorporate(model, Y) {
  const cc = model.corporate;
  const rows = cc.items.map((item) => ({ ...item, values: Y.map((y) => unitValue(cc.mode, item.base, cc.mode === 'escalate' ? item.escalation : 0, item.byYear, y)) }));
  const total = Y.map((y) => rows.reduce((t, r) => t + r.values[y], 0));
  return { rows, total, fiveYear: sum(total) };
}

export function computeTechnology(model, hc, Y) {
  const t = model.technology;
  const esc = (y) => factor(t.escalation, y);
  const rows = TECHNOLOGY_FIELDS.filter((f) => f.kind === 'recurring').map((f) => ({ key: f.key, name: f.name, values: Y.map((y) => num(t[f.key]) * hc.average[y] * 12 * esc(y)) }));
  const recurring = Y.map((y) => rows.reduce((s, r) => s + r.values[y], 0));
  const refresh = Math.max(1, Math.round(num(t.refreshYears)) || 99);
  const devicesNew = Y.map((y) => Math.max(hc.netAdd[y], 0));
  const devicesRefreshed = Y.map(() => 0);
  const bought = Y.map(() => 0);
  Y.forEach((y) => { devicesRefreshed[y] = y - refresh >= 0 ? bought[y - refresh] : 0; bought[y] = devicesNew[y] + devicesRefreshed[y]; });
  const devices = Y.map((y) => bought[y] * num(t.device) * esc(y));
  const total = Y.map((y) => recurring[y] + devices[y]);
  return { rows, recurring, devicesNew, devicesRefreshed, devicesBought: bought, devices, total, fiveYear: sum(total) };
}

export function computeRealEstate(model, hc, Y) {
  const type = model.realEstate.type;
  const def = REAL_ESTATE_TYPES.find((t) => t.key === type);
  const re = type ? model.realEstate[type] || {} : {};
  const esc = (y) => factor(re.escalation, y);
  const zero = Y.map(() => 0);
  let space = zero, operating = zero, parking = zero, setup = zero, deposit = zero, area = zero;
  if (type === 'managed') {
    space = Y.map((y) => hc.seats[y] * num(re.seatCost) * 12 * esc(y));
    parking = Y.map((y) => hc.bays[y] * num(re.parkingCost) * 12 * esc(y));
    setup = Y.map((y) => hc.newSeats[y] * num(re.setupPerSeat) * esc(y));
    deposit = Y.map((y) => hc.newSeats[y] * num(re.seatCost) * num(re.depositMonths) * esc(y));
  } else if (type === 'coworking') {
    space = Y.map((y) => hc.seats[y] * num(re.deskCost) * 12 * esc(y));
    operating = Y.map((y) => hc.average[y] * num(re.extrasPerFte) * 12 * esc(y));
    setup = Y.map((y) => hc.newSeats[y] * num(re.setupPerDesk) * esc(y));
    deposit = Y.map((y) => hc.newSeats[y] * num(re.deskCost) * num(re.depositMonths) * esc(y));
  } else if (type === 'lease') {
    area = Y.map((y) => hc.seats[y] * num(re.areaPerFte));
    const newArea = Y.map((y) => Math.max(area[y] - (y ? area[y - 1] : 0), 0));
    space = Y.map((y) => area[y] * num(re.rentPerSqft) * (12 - (y === 0 ? Math.min(num(re.rentFreeMonths), 12) : 0)) * esc(y));
    operating = Y.map((y) => area[y] * (num(re.camPerSqft) + num(re.utilitiesPerSqft)) * 12 * esc(y));
    parking = Y.map((y) => hc.bays[y] * num(re.parkingCost) * 12 * esc(y));
    setup = Y.map((y) => newArea[y] * num(re.fitoutPerSqft) * esc(y));
    deposit = Y.map((y) => newArea[y] * num(re.rentPerSqft) * num(re.depositMonths) * esc(y));
  }
  const total = Y.map((y) => space[y] + operating[y] + parking[y] + setup[y]);
  return { type, typeName: def?.name || 'Not selected', space, operating, parking, setup, deposit, area, total, fiveYear: sum(total), depositTotal: sum(deposit) };
}

export function computeEstablishment(model, Y) {
  const items = ESTABLISHMENT_ITEMS.map((it) => ({ ...it, value: num(model.establishment[it.key]) }));
  const total = items.reduce((t, it) => t + it.value, 0);
  const byYear = Y.map((y) => (y === 0 ? total : 0));
  return { items, total, byYear };
}

export function compute(model) {
  const Y = yearsOf(model);
  const N = Y.length;
  const L = N - 1;
  const startYear = Math.round(num(model.settings.startYear)) || new Date().getFullYear() + 1;
  const years = Y.map((y) => ({ index: y, label: `Y${y + 1}`, year: startYear + y }));
  const headcount = computeHeadcount(model, Y);
  const compensation = computeCompensation(model, headcount, Y);
  const otherPeople = computeOtherPeople(model, headcount, Y);
  const corporate = computeCorporate(model, Y);
  const technology = computeTechnology(model, headcount, Y);
  const realEstate = computeRealEstate(model, headcount, Y);
  const establishment = computeEstablishment(model, Y);

  const valuesByKey = { compensation: compensation.total, otherPeople: otherPeople.total, corporate: corporate.total, technology: technology.total, realEstate: realEstate.total, establishment: establishment.byYear };
  const categories = CATEGORIES.map((c) => ({ ...c, values: valuesByKey[c.key], total: sum(valuesByKey[c.key]) }));
  const byYear = Y.map((y) => categories.reduce((t, c) => t + c.values[y], 0));
  const fiveYear = sum(byYear);
  const oneTime = Y.map((y) => establishment.byYear[y] + realEstate.setup[y] + technology.devices[y]);
  const operating = Y.map((y) => byYear[y] - oneTime[y]);
  const avgHcSum = sum(headcount.average);
  const costPerFte = Y.map((y) => (headcount.average[y] > 0 ? byYear[y] / headcount.average[y] : 0));
  const perFteByCategory = categories.map((c) => ({ ...c, values: Y.map((y) => (headcount.average[y] > 0 ? c.values[y] / headcount.average[y] : 0)) }));
  const totals = {
    byYear, fiveYear, avgAnnual: fiveYear / N, runRate: byYear[L], operating, oneTime, costPerFte,
    avgCostPerFte: avgHcSum > 0 ? fiveYear / avgHcSum : 0,
    finalCostPerFte: costPerFte[L],
    cumulativeCostPerFte: avgHcSum > 0 ? fiveYear / (avgHcSum / N) : 0,
    avgHeadcount: avgHcSum / N,
    finalHeadcount: headcount.exit[L],
  };
  const deposits = realEstate.deposit;
  const totalOut = Y.map((y) => byYear[y] + deposits[y]);
  const cumulative = [];
  totalOut.reduce((acc, v, y) => { cumulative[y] = acc + v; return cumulative[y]; }, 0);
  const cashflow = { operating, oneTime, deposits, totalOut, cumulative, depositTotal: realEstate.depositTotal };
  const status = assess(model, headcount);
  return { Y, N, L, years, headcount, compensation, otherPeople, corporate, technology, realEstate, establishment, categories, perFteByCategory, totals, cashflow, status };
}

// Completion status per input step: 'done' | 'partial' | 'empty'.
export function assess(model, hc) {
  const s = model.settings;
  const st = (filled, total) => (filled === 0 ? 'empty' : filled === total ? 'done' : 'partial');
  const count = (vals) => vals.filter(has).length;
  const setupReq = [s.companyName, s.gccName, s.country, s.currency, s.horizonYears].filter((v) => v !== '' && v !== null && v !== undefined).length;
  const headcountDone = hc.entered && hc.exit.every((v) => v > 0) && hc.mixValid.every(Boolean);
  const headcountAny = hc.entered || hc.mixEntered.some(Boolean);
  const bandBases = model.compensation.bands.map((b) => b.base);
  const benefits = model.compensation.benefits.map((b) => b.value);
  const other = [...model.otherPeople.hiring, ...model.otherPeople.operating, ...model.otherPeople.center].map((r) => r.value);
  const reType = model.realEstate.type;
  const reDef = REAL_ESTATE_TYPES.find((t) => t.key === reType);
  const reVals = reDef ? reDef.fields.map((f) => model.realEstate[reType][f.key]) : [];
  const techVals = TECHNOLOGY_FIELDS.map((f) => model.technology[f.key]);
  const corpVals = model.corporate.items.map((i) => i.base);
  const estVals = ESTABLISHMENT_ITEMS.map((i) => model.establishment[i.key]);
  return {
    setup: st(setupReq, 5),
    headcount: headcountDone ? 'done' : headcountAny ? 'partial' : 'empty',
    compensation: count(bandBases) === BANDS.length ? (count(benefits) > 0 ? 'done' : 'partial') : st(count(bandBases), BANDS.length),
    other: st(count(other), other.length),
    realEstate: !reType ? 'empty' : st(count(reVals), reVals.length),
    technology: st(count(techVals), techVals.length),
    corporate: st(count(corpVals), corpVals.length),
    establishment: st(count(estVals), estVals.length),
  };
}

// ---------- Sensitivity ----------
export const SENSITIVITY_DRIVERS = [
  { key: 'headcount', name: 'Headcount ramp', flex: 20 },
  { key: 'salary', name: 'Base salary', flex: 10 },
  { key: 'realEstate', name: 'Real estate unit costs', flex: 20 },
  { key: 'technology', name: 'Technology unit costs', flex: 20 },
  { key: 'otherPeople', name: 'Other people costs', flex: 20 },
  { key: 'corporate', name: 'Corporate costs', flex: 20 },
];
const scaleNullable = (v, k) => (has(v) ? Number(v) * k : v);
const scaleRow = (row, k) => ({ ...row, value: scaleNullable(row.value, k), byYear: (row.byYear || []).map((v) => scaleNullable(v, k)) });

export function flexModel(model, driver, pct) {
  const k = 1 + pct / 100;
  const m = structuredClone(model);
  switch (driver) {
    case 'headcount': m.headcount.exit = m.headcount.exit.map((v) => (has(v) ? Math.round(Number(v) * k) : v)); break;
    case 'salary': m.compensation.bands = m.compensation.bands.map((b) => ({ ...b, base: scaleNullable(b.base, k), baseByYear: b.baseByYear.map((v) => scaleNullable(v, k)) })); break;
    case 'realEstate': {
      const t = m.realEstate.type; if (!t) break;
      const def = REAL_ESTATE_TYPES.find((x) => x.key === t);
      def.fields.filter((f) => f.prefix === 'currency').forEach((f) => { m.realEstate[t][f.key] = scaleNullable(m.realEstate[t][f.key], k); });
      break;
    }
    case 'technology': TECHNOLOGY_FIELDS.filter((f) => f.kind !== 'driver').forEach((f) => { m.technology[f.key] = scaleNullable(m.technology[f.key], k); }); break;
    case 'otherPeople': ['hiring', 'operating', 'center'].forEach((sec) => { m.otherPeople[sec] = m.otherPeople[sec].map((r) => scaleRow(r, k)); }); break;
    case 'corporate': m.corporate.items = m.corporate.items.map((r) => ({ ...r, base: scaleNullable(r.base, k), byYear: r.byYear.map((v) => scaleNullable(v, k)) })); break;
    default: break;
  }
  return m;
}

export function computeSensitivity(model, base, drivers = SENSITIVITY_DRIVERS) {
  return drivers.map((d) => {
    const up = compute(flexModel(model, d.key, d.flex)).totals;
    const down = compute(flexModel(model, d.key, -d.flex)).totals;
    return {
      ...d,
      upFiveYear: up.fiveYear - base.totals.fiveYear, downFiveYear: down.fiveYear - base.totals.fiveYear,
      upRunRate: up.runRate - base.totals.runRate, downRunRate: down.runRate - base.totals.runRate,
      upPct: base.totals.fiveYear ? (up.fiveYear / base.totals.fiveYear - 1) * 100 : 0,
      downPct: base.totals.fiveYear ? (down.fiveYear / base.totals.fiveYear - 1) * 100 : 0,
    };
  });
}
