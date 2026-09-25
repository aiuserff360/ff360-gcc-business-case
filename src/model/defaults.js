// Model shape, catalogues and metadata. Every user input starts EMPTY (null).
// Industry averages live in model.benchmarks keyed by a dotted path; a researched
// library (see benchmarks.js) can be loaded on demand.

import { BENCHMARK_LIBRARY, libraryValues, librarySources } from './benchmarks.js';

export const DEFAULT_LIBRARY = 'india-usd';
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

// Exchange rates: ECB euro reference rates for 24 Sep 2026 converted to units per USD (EUR/USD 1.1367); AED is the central-bank peg.
export const FX = {
  asOf: '24 September 2026',
  source: 'European Central Bank euro foreign exchange reference rates, converted to per-USD',
  url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
  perUsd: { USD: 1, EUR: 0.8797, GBP: 0.7565, JPY: 158.85, INR: 95.96, CHF: 0.8278, AUD: 1.4232, CAD: 1.4117, SGD: 1.2799, AED: 3.6725, CNY: 6.7126, HKD: 7.8427, SEK: 9.9098, PLN: 3.8553, MXN: 17.584, BRL: 5.1808, PHP: 62.75, MYR: 4.087 },
};
export const fxRate = (from, to) => (FX.perUsd[to] || 1) / (FX.perUsd[from] || 1);
// Convert one amount; small unit rates keep two decimals, everything else rounds to whole units.
export const convertAmount = (v, from, to) => {
  if (!has(v) || from === to) return v;
  const x = Number(v) * fxRate(from, to);
  return Math.abs(x) < 100 ? Math.round(x * 100) / 100 : Math.round(x);
};

// Industry averages for a case currency: library values converted from the library currency.
export function defaultBenchmarks(currency = 'USD', model = null) {
  const lib = BENCHMARK_LIBRARY[DEFAULT_LIBRARY];
  const values = libraryValues(lib);
  const money = benchmarkMoneyKeys(model);
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, money.has(k) ? convertAmount(v, lib.currency, currency) : v]));
}

export const MIN_HORIZON = 3;
export const MAX_HORIZON = 10;

export const BANDS = [
  { id: 'b1', name: '0 – 3 years', short: '0–3', roles: 'Junior / Analyst / Associate' },
  { id: 'b2', name: '3 – 6 years', short: '3–6', roles: 'Engineer / Consultant' },
  { id: 'b3', name: '6 – 10 years', short: '6–10', roles: 'Senior / Lead' },
  { id: 'b4', name: '10 – 15 years', short: '10–15', roles: 'Manager / Architect' },
  { id: 'b5', name: '15+ years', short: '15+', roles: 'Director / Principal / Leadership' },
];
export const BAND_COLORS = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'];

export const CATEGORIES = [
  { key: 'compensation', name: 'People costs (compensation)', short: 'Compensation', color: '#2a78d6' },
  { key: 'otherPeople', name: 'Other people costs', short: 'Other people', color: '#eb6834' },
  { key: 'corporate', name: 'Center / corporate costs', short: 'Corporate', color: '#1baf7a' },
  { key: 'technology', name: 'Technology costs', short: 'Technology', color: '#eda100' },
  { key: 'realEstate', name: 'Real estate costs', short: 'Real estate', color: '#e87ba4' },
  { key: 'establishment', name: 'One-time establishment', short: 'Establishment', color: '#008300' },
];

export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese yen' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee' },
  { code: 'CHF', symbol: 'CHF ', name: 'Swiss franc' },
  { code: 'AUD', symbol: 'A$', name: 'Australian dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore dollar' },
  { code: 'AED', symbol: 'AED ', name: 'UAE dirham' },
  { code: 'CNY', symbol: 'CN¥', name: 'Chinese yuan' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong dollar' },
  { code: 'SEK', symbol: 'kr ', name: 'Swedish krona' },
  { code: 'PLN', symbol: 'zł ', name: 'Polish złoty' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian real' },
  { code: 'PHP', symbol: '₱', name: 'Philippine peso' },
  { code: 'MYR', symbol: 'RM ', name: 'Malaysian ringgit' },
];

export const INPUT_MODES = [
  { value: 'same', label: 'Same across all years' },
  { value: 'escalate', label: 'Apply annual escalation' },
  { value: 'byYear', label: 'Customize by year' },
];

export const OBJECTIVES = [
  'Cost optimisation / labour arbitrage',
  'Access to talent and skills',
  'Engineering / product development hub',
  'Shared services (finance, HR, procurement)',
  'IT and digital transformation center',
  'Innovation / R&D center',
  'Customer support / operations',
  'Multi-function global capability center',
];

// ---------- Real estate ----------
export const REAL_ESTATE_TYPES = [
  {
    key: 'managed',
    name: 'Managed office',
    tagline: 'Fully serviced, per-seat pricing',
    description: 'A private, branded office operated by a provider. One all-inclusive monthly fee per seat covers rent, fit-out, furniture, utilities, maintenance, internet and housekeeping. Fast to occupy (4–8 weeks), typically 1–3 year terms, and the provider carries the capital cost. Best for the first 50–500 seats or when speed and flexibility matter more than the lowest long-run cost.',
    fit: 'Speed to market · low upfront capital · flexible growth',
    fields: [
      { key: 'seatCost', name: 'Cost per seat per month', prefix: 'currency', unit: 'per seat / month', meaning: 'All-inclusive monthly fee per seat: rent, fit-out, furniture, utilities, CAM, internet, housekeeping and facility management.' },
      { key: 'seatsPct', name: 'Seats as % of headcount', suffix: '%', unit: '% of headcount', meaning: 'Seats required as a share of exit headcount. 80% reflects hybrid working; 100% gives everyone a dedicated seat.' },
      { key: 'setupPerSeat', name: 'One-time setup per new seat', prefix: 'currency', unit: 'per seat (one-time)', meaning: 'Branding, customisation, access cards and IT cabling for each newly added seat.' },
      { key: 'depositMonths', name: 'Security deposit', unit: 'months', meaning: 'Refundable deposit to the provider, typically 2–6 months of seat fees. Treated as a cash outlay, not an operating cost.' },
      { key: 'parkingRatio', name: 'Parking ratio (1 bay per N employees)', prefix: '1 :', unit: 'employees per bay', meaning: 'One parking bay for every N employees (1:5 = one bay per five employees).' },
      { key: 'parkingCost', name: 'Parking cost per bay per month', prefix: 'currency', unit: 'per bay / month', meaning: 'Monthly charge per parking bay at the location.' },
      { key: 'escalation', name: 'Annual escalation', suffix: '%', unit: '% per year', meaning: 'Expected annual increase in seat fees and parking. Keep 0% for a constant-cost model.' },
    ],
  },
  {
    key: 'coworking',
    name: 'Coworking / flexible space',
    tagline: 'Shared space, per-desk membership',
    description: 'Dedicated or hot desks inside a shared coworking centre on a monthly membership. Lowest commitment and fastest to start (days), with shared meeting rooms, reception and amenities billed as credits or extras. Suits pilot teams, satellite locations and the first 10–100 people before a private office is justified. Less control over security, branding and expansion.',
    fit: 'Pilot teams · satellite cities · month-to-month flexibility',
    fields: [
      { key: 'deskCost', name: 'Cost per desk per month', prefix: 'currency', unit: 'per desk / month', meaning: 'Membership fee per dedicated desk, including shared amenities, internet and utilities.' },
      { key: 'seatsPct', name: 'Desks as % of headcount', suffix: '%', unit: '% of headcount', meaning: 'Desks required as a share of exit headcount. Hot-desking models often run at 60–80%.' },
      { key: 'extrasPerFte', name: 'Meeting rooms & extras per FTE per month', prefix: 'currency', unit: 'per FTE / month', meaning: 'Meeting-room credits, printing, guest passes, event space and other pay-as-you-go extras.' },
      { key: 'setupPerDesk', name: 'One-time onboarding per new desk', prefix: 'currency', unit: 'per desk (one-time)', meaning: 'Membership onboarding, access cards and locker or storage set-up for each new desk.' },
      { key: 'depositMonths', name: 'Security deposit', unit: 'months', meaning: 'Refundable deposit, typically 1–3 months of membership fees. Treated as a cash outlay, not an operating cost.' },
      { key: 'escalation', name: 'Annual escalation', suffix: '%', unit: '% per year', meaning: 'Expected annual increase in membership fees and extras.' },
    ],
  },
  {
    key: 'lease',
    name: 'Conventional lease (bare shell + fit-out)',
    tagline: 'Leased floor plate, own fit-out',
    description: 'A direct lease of a warm-shell or bare-shell floor plate, with the company funding fit-out, furniture and operations. Lowest cost per seat at scale (typically 300+ seats) and full control over design, security and brand, but higher upfront capital, longer lock-ins (5–9 years with escalation every 3 years) and 6–9 months to occupy. Rent-free fit-out periods are common.',
    fit: 'Scale (300+ seats) · full control · lowest long-run cost',
    fields: [
      { key: 'areaPerFte', name: 'Usable area per seat', unit: 'sq ft per seat', meaning: 'Usable area allocated per seat including circulation, meeting rooms and amenities. 70–100 sq ft is typical for modern open plans.' },
      { key: 'seatsPct', name: 'Seats as % of headcount', suffix: '%', unit: '% of headcount', meaning: 'Seats required as a share of exit headcount; drives total area.' },
      { key: 'rentPerSqft', name: 'Rent per sq ft per month', prefix: 'currency', unit: 'per sq ft / month', meaning: 'Base rent on usable area. Enter the effective rent after any negotiated discounts.' },
      { key: 'camPerSqft', name: 'Maintenance (CAM) per sq ft per month', prefix: 'currency', unit: 'per sq ft / month', meaning: 'Common-area maintenance, property tax pass-through, security and building services.' },
      { key: 'utilitiesPerSqft', name: 'Utilities & housekeeping per sq ft per month', prefix: 'currency', unit: 'per sq ft / month', meaning: 'Power, HVAC, water, housekeeping and consumables borne by the tenant.' },
      { key: 'fitoutPerSqft', name: 'Fit-out cost per sq ft', prefix: 'currency', unit: 'per sq ft (one-time)', meaning: 'Interior fit-out, furniture, cabling, AV and security for each newly leased area.' },
      { key: 'rentFreeMonths', name: 'Rent-free period', unit: 'months (first year)', meaning: 'Rent-free months granted for fit-out at lease start; reduces first-year rent.' },
      { key: 'depositMonths', name: 'Security deposit', unit: 'months of rent', meaning: 'Refundable deposit to the landlord, typically 6–12 months of rent in India. Treated as a cash outlay.' },
      { key: 'parkingRatio', name: 'Parking ratio (1 bay per N employees)', prefix: '1 :', unit: 'employees per bay', meaning: 'One parking bay for every N employees.' },
      { key: 'parkingCost', name: 'Parking cost per bay per month', prefix: 'currency', unit: 'per bay / month', meaning: 'Monthly charge per parking bay.' },
      { key: 'escalation', name: 'Annual escalation', suffix: '%', unit: '% per year', meaning: 'Annualised rent and operating cost escalation (a 15% step every 3 years is roughly 4.8% per year).' },
    ],
  },
];

// ---------- Technology ----------
export const TECHNOLOGY_FIELDS = [
  { key: 'device', name: 'End-user device cost', prefix: 'currency', unit: 'per device (one-time)', kind: 'oneTime', meaning: 'Laptop or desktop per employee including basic accessories, OS and standard software.' },
  { key: 'collab', name: 'Collaboration & productivity licenses', prefix: 'currency', unit: 'per user / month', kind: 'recurring', meaning: 'Microsoft 365 / Google Workspace, email, Teams or Slack and collaboration suites.' },
  { key: 'apps', name: 'Business application licenses', prefix: 'currency', unit: 'per user / month', kind: 'recurring', meaning: 'Average enterprise application licenses (ERP, PLM, CRM, engineering tools) per employee.' },
  { key: 'cloud', name: 'IT infrastructure & cloud services', prefix: 'currency', unit: 'per user / month', kind: 'recurring', meaning: 'Cloud infrastructure, storage, compute, backup and core IT platforms on a per-employee basis.' },
  { key: 'security', name: 'Cybersecurity tools', prefix: 'currency', unit: 'per user / month', kind: 'recurring', meaning: 'Endpoint security, identity and access management, monitoring and related tooling.' },
  { key: 'support', name: 'IT support & service management', prefix: 'currency', unit: 'per user / month', kind: 'recurring', meaning: 'Service desk, ITSM tooling, asset management and on-site support.' },
  { key: 'network', name: 'Network & connectivity', prefix: 'currency', unit: 'per user / month', kind: 'recurring', meaning: 'Internet, SD-WAN, local telco, bandwidth and network hardware.' },
  { key: 'datacenter', name: 'Data center / hosting (if applicable)', prefix: 'currency', unit: 'per user / month', kind: 'recurring', meaning: 'On-premise hosting, data center services or dedicated environments, if any.' },
  { key: 'refreshYears', name: 'Hardware refresh cycle', unit: 'years', kind: 'driver', meaning: 'Devices bought in a year are replaced this many years later, inside the horizon.' },
  { key: 'escalation', name: 'Annual escalation', suffix: '%', unit: '% per year', kind: 'driver', meaning: 'Expected annual increase in licensing, cloud and support costs.' },
];

// ---------- Establishment ----------
export const ESTABLISHMENT_ITEMS = [
  { key: 'legal', name: 'Entity / legal establishment', meaning: 'Incorporation, legal fees, regulatory approvals, tax registration and other statutory set-up costs.' },
  { key: 'policies', name: 'Policies / process setup', meaning: 'Initial HR, finance, procurement, compliance and governance policies and processes.' },
  { key: 'branding', name: 'Employer branding / recruitment launch', meaning: 'Employer brand, launch campaigns, campus and outreach activities and market presence.' },
  { key: 'travel', name: 'Initial travel & knowledge transfer', meaning: 'Travel, accommodation and knowledge transfer for key stakeholders and initial team ramp-up.' },
  { key: 'program', name: 'Program / transition management', meaning: 'Program management, transition planning, vendor and change management, mobilisation support.' },
  { key: 'contingency', name: 'Other / contingency', meaning: 'Advisory, initial marketing, unforeseen costs and general contingency.' },
];

export const BENEFIT_ROWS = [
  { id: 'epf', name: 'Employer provident / pension contribution', type: 'pctOfBasic', note: 'Statutory' },
  { id: 'gratuity', name: 'Gratuity / severance provision', type: 'pctOfBasic', note: 'Statutory' },
  { id: 'medical', name: 'Medical insurance', type: 'perEmployee', note: 'Annual cost per employee' },
  { id: 'life', name: 'Life & accident insurance', type: 'perEmployee', note: 'Annual cost per employee' },
  { id: 'learning', name: 'Learning & development', type: 'perEmployee', note: 'Training and certification' },
  { id: 'engagement', name: 'Employee engagement', type: 'perEmployee', note: 'Wellness, engagement programs' },
  { id: 'otherBenefits', name: 'Other employee benefits', type: 'perEmployee', note: 'Transport, meals, etc.' },
];
export const HIRING_ROWS = [
  { id: 'agency', name: 'Recruitment / agency fee', applyTo: 'all' },
  { id: 'bgv', name: 'Background verification', applyTo: 'all' },
  { id: 'medicalCheck', name: 'Pre-employment medical', applyTo: 'all' },
  { id: 'signOn', name: 'Sign-on bonus', applyTo: 'selected' },
  { id: 'relocation', name: 'Relocation assistance', applyTo: 'selected' },
  { id: 'onboarding', name: 'Initial training / onboarding', applyTo: 'all' },
];
export const OPERATING_ROWS = [
  { id: 'transport', name: 'Employee transport', applyTo: 'all' },
  { id: 'travel', name: 'Business travel', applyTo: 'all' },
  { id: 'events', name: 'Team events / townhalls', applyTo: 'all' },
  { id: 'rewards', name: 'Rewards & recognition', applyTo: 'all' },
];
export const CENTER_PEOPLE_ROWS = [
  { id: 'recruitBrand', name: 'Recruitment / employer branding' },
  { id: 'careerDev', name: 'Career development programs' },
  { id: 'otherPeopleCost', name: 'Other people cost' },
];
export const CORPORATE_ROWS = [
  { id: 'compliance', name: 'Entity / statutory compliance', note: 'Filings, compliance' },
  { id: 'finance', name: 'Finance / payroll administration', note: 'Payroll processing, finance ops' },
  { id: 'legalTax', name: 'Legal / tax / audit', note: 'Legal advisory, tax, audit fees' },
  { id: 'insurance', name: 'Corporate / business insurance', note: 'Business, liability, property' },
  { id: 'governance', name: 'GCC governance / administration', note: 'Office management, admin' },
  { id: 'overhead', name: 'Other corporate overhead', note: 'Misc. corporate-level costs' },
];

const nulls = (n) => Array.from({ length: n }, () => null);

export function createDefaultModel(horizon = 5, currency = 'USD') {
  const N = horizon;
  return {
    settings: {
      companyName: '',
      gccName: '',
      objective: '',
      plan: '',
      country: '',
      city: '',
      currency,
      startYear: new Date().getFullYear() + 1,
      horizonYears: N,
      attritionPct: null,
    },
    headcount: { exit: nulls(N), mixMode: 'byYear', mix: BANDS.map(() => nulls(N)) },
    compensation: {
      mode: 'same',
      escalation: null,
      basicPct: null,
      bands: BANDS.map(() => ({ base: null, variablePct: null, allowancePct: null, escalation: null, baseByYear: nulls(N) })),
      benefits: BENEFIT_ROWS.map((b) => ({ ...b, value: null, applyTo: 'all' })),
    },
    otherPeople: {
      mode: 'same',
      escalation: null,
      hiring: HIRING_ROWS.map((r) => ({ ...r, value: null, eligibility: r.applyTo === 'all' ? 100 : null, byYear: nulls(N) })),
      operating: OPERATING_ROWS.map((r) => ({ ...r, value: null, eligibility: 100, byYear: nulls(N) })),
      center: CENTER_PEOPLE_ROWS.map((r) => ({ ...r, value: null, byYear: nulls(N) })),
    },
    realEstate: {
      type: null,
      description: '',
      managed: Object.fromEntries(REAL_ESTATE_TYPES[0].fields.map((f) => [f.key, null])),
      coworking: Object.fromEntries(REAL_ESTATE_TYPES[1].fields.map((f) => [f.key, null])),
      lease: Object.fromEntries(REAL_ESTATE_TYPES[2].fields.map((f) => [f.key, null])),
    },
    technology: Object.fromEntries(TECHNOLOGY_FIELDS.map((f) => [f.key, null])),
    corporate: { mode: 'same', escalation: null, items: CORPORATE_ROWS.map((r) => ({ ...r, base: null, escalation: null, byYear: nulls(N) })) },
    establishment: Object.fromEntries(ESTABLISHMENT_ITEMS.map((it) => [it.key, null])),
    benchmarks: defaultBenchmarks(currency),
  };
}

// Pad or truncate every per-year array to the horizon.
export function resizeModel(model) {
  const N = Math.min(MAX_HORIZON, Math.max(MIN_HORIZON, Math.round(Number(model.settings.horizonYears) || 5)));
  model.settings.horizonYears = N;
  const fit = (arr, fill = null) => { const a = Array.isArray(arr) ? arr.slice(0, N) : []; while (a.length < N) a.push(typeof fill === 'function' ? fill(a) : fill); return a; };
  const last = (a) => (a.length ? a[a.length - 1] : null);
  model.headcount.exit = fit(model.headcount.exit);
  model.headcount.mix = BANDS.map((_, b) => fit(model.headcount.mix?.[b], last));
  model.compensation.bands.forEach((b) => { b.baseByYear = fit(b.baseByYear, last); });
  ['hiring', 'operating', 'center'].forEach((sec) => model.otherPeople[sec].forEach((r) => { r.byYear = fit(r.byYear, last); }));
  model.corporate.items.forEach((it) => { it.byYear = fit(it.byYear, last); });
  return model;
}

// Every (input path, benchmark key) pair, so pages can offer "fill empty inputs from industry average".
export function benchmarkEntries(model = null) {
  const e = [];
  const benefitType = (i) => model?.compensation?.benefits?.[i]?.type ?? BENEFIT_ROWS[i].type;
  BANDS.forEach((_, i) => {
    e.push({ path: ['compensation', 'bands', i, 'base'], key: `compensation.bands.${i}.base`, money: true });
    e.push({ path: ['compensation', 'bands', i, 'variablePct'], key: `compensation.bands.${i}.variablePct` });
    e.push({ path: ['compensation', 'bands', i, 'allowancePct'], key: `compensation.bands.${i}.allowancePct` });
  });
  e.push({ path: ['compensation', 'basicPct'], key: 'compensation.basicPct' });
  e.push({ path: ['compensation', 'escalation'], key: 'compensation.escalation' });
  BENEFIT_ROWS.forEach((b, i) => e.push({ path: ['compensation', 'benefits', i, 'value'], key: `compensation.benefits.${b.id}`, money: benefitType(i) === 'perEmployee' }));
  HIRING_ROWS.forEach((r, i) => { e.push({ path: ['otherPeople', 'hiring', i, 'value'], key: `otherPeople.hiring.${r.id}`, money: true }); e.push({ path: ['otherPeople', 'hiring', i, 'eligibility'], key: `otherPeople.hiring.${r.id}.eligibility` }); });
  OPERATING_ROWS.forEach((r, i) => { e.push({ path: ['otherPeople', 'operating', i, 'value'], key: `otherPeople.operating.${r.id}`, money: true }); e.push({ path: ['otherPeople', 'operating', i, 'eligibility'], key: `otherPeople.operating.${r.id}.eligibility` }); });
  CENTER_PEOPLE_ROWS.forEach((r, i) => e.push({ path: ['otherPeople', 'center', i, 'value'], key: `otherPeople.center.${r.id}`, money: true }));
  e.push({ path: ['otherPeople', 'escalation'], key: 'otherPeople.escalation' });
  REAL_ESTATE_TYPES.forEach((t) => t.fields.forEach((f) => e.push({ path: ['realEstate', t.key, f.key], key: `realEstate.${t.key}.${f.key}`, money: f.prefix === 'currency' })));
  TECHNOLOGY_FIELDS.forEach((f) => e.push({ path: ['technology', f.key], key: `technology.${f.key}`, money: f.prefix === 'currency' }));
  CORPORATE_ROWS.forEach((r, i) => { e.push({ path: ['corporate', 'items', i, 'base'], key: `corporate.${r.id}`, money: true }); });
  e.push({ path: ['corporate', 'escalation'], key: 'corporate.escalation' });
  ESTABLISHMENT_ITEMS.forEach((it) => e.push({ path: ['establishment', it.key], key: `establishment.${it.key}`, money: true }));
  e.push({ path: ['settings', 'attritionPct'], key: 'settings.attritionPct' });
  return e;
}

export const benchmarkMoneyKeys = (model = null) => new Set(benchmarkEntries(model).filter((e) => e.money).map((e) => e.key));

// Every monetary input path in the model (so a currency change converts them all).
export function monetaryPaths(model) {
  const p = [];
  const N = model.headcount.exit.length;
  model.compensation.bands.forEach((b, i) => { p.push(['compensation', 'bands', i, 'base']); for (let y = 0; y < N; y += 1) p.push(['compensation', 'bands', i, 'baseByYear', y]); });
  model.compensation.benefits.forEach((b, i) => { if (b.type === 'perEmployee') p.push(['compensation', 'benefits', i, 'value']); });
  ['hiring', 'operating', 'center'].forEach((sec) => model.otherPeople[sec].forEach((r, i) => { p.push(['otherPeople', sec, i, 'value']); for (let y = 0; y < N; y += 1) p.push(['otherPeople', sec, i, 'byYear', y]); }));
  model.corporate.items.forEach((it, i) => { p.push(['corporate', 'items', i, 'base']); for (let y = 0; y < N; y += 1) p.push(['corporate', 'items', i, 'byYear', y]); });
  ESTABLISHMENT_ITEMS.forEach((it) => p.push(['establishment', it.key]));
  TECHNOLOGY_FIELDS.filter((f) => f.prefix === 'currency').forEach((f) => p.push(['technology', f.key]));
  REAL_ESTATE_TYPES.forEach((t) => t.fields.filter((f) => f.prefix === 'currency').forEach((f) => p.push(['realEstate', t.key, f.key])));
  return p;
}

// Convert every amount (inputs and industry averages) in place from one currency to another. Returns the count converted.
export function convertModelCurrency(model, from, to) {
  if (from === to) return 0;
  let n = 0;
  monetaryPaths(model).forEach((path) => {
    let t = model;
    for (let i = 0; i < path.length - 1; i += 1) t = t[path[i]];
    const leaf = path[path.length - 1];
    if (has(t[leaf])) { t[leaf] = convertAmount(t[leaf], from, to); n += 1; }
  });
  const money = benchmarkMoneyKeys(model);
  Object.keys(model.benchmarks || {}).forEach((k) => { if (money.has(k) && has(model.benchmarks[k])) { model.benchmarks[k] = convertAmount(model.benchmarks[k], from, to); n += 1; } });
  model.settings.currency = to;
  return n;
}

export { BENCHMARK_LIBRARY, librarySources, libraryValues };
