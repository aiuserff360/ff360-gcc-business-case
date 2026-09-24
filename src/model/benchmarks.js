// Industry-average reference library. Researched September 2026 from public sources (see `sources`).
// FX: 1 USD ≈ ₹96 (tradingeconomics.com, 24 Sep 2026). Values are rounded planning figures, not quotes.
// Each entry: value in the library currency, the basis used to derive it, and the source it came from.

const FX = 96;
const inr = (rupees) => Math.round(rupees / FX);

const S = {
  gccSalary: { name: 'GCC ERA – GCC Salary Report 2026; Quantalent – Software Engineer Salary Bangalore GCC 2026; Instahyre – Software Engineer Salary in India 2026', url: 'https://gccera.com/blog/gcc-salary-report-2026' },
  aon: { name: 'Aon Annual Salary Increase and Turnover Survey 2025–26 (India 9.1% in 2026; GCCs 9.9% in 2025)', url: 'https://www.aon.com/apac/in-the-press/asia-newsroom/2026/aon-survey-projects-slight-uptick-in-salaries-in-india-2026' },
  variable: { name: 'SalaryBox – Variable pay in India (IT 10–20% of CTC; cross-industry average 18.7% in 2025)', url: 'https://salarybox.in/blog/what-is-variable-pay-types-calculation-india-specific-guide/' },
  basic: { name: 'Code on Wages – basic pay at 50% of CTC; typical Indian structures 40–50%', url: 'https://savvyhrms.com/basic-pay-50-rule-explained/' },
  statutory: { name: 'EPF Act (employer 12% of basic); Payment of Gratuity Act (4.81% of basic accrual)', url: 'https://en.wikipedia.org/wiki/Cost_to_company' },
  medical: { name: 'Plum / Onsurity / Niva Bupa – group health premium ₹10,000–30,000 per employee per year, employer share 60–70%', url: 'https://www.plumhq.com/blog/employee-health-insurance-cost-per-employee-india' },
  ld: { name: 'Training Industry Report 2025 – $874 per learner; India corporate L&D at 1–2% of employee cost', url: 'https://trainingmag.com/2025-training-industry-report/' },
  agency: { name: 'GoodSpace / TM Services – recruitment agency fees 8.33%–16.67% of CTC; cost per hire ₹35,000+', url: 'https://goodspace.ai/blogs/709434/recruitment-agency-fees-in-india-what-employers-actually-pay-in-2026' },
  bgv: { name: 'MPloyChek / SalaryBox – background verification ₹1,500–3,500 per candidate for a standard corporate package', url: 'https://mploychek.com/blog-cost-background-verification-india/' },
  relocation: { name: 'Taggd / NoBroker – relocation allowance ₹25,000–2,00,000, mid-level average around ₹1 lakh', url: 'https://taggd.in/hr-glossary/relocation-allowance/' },
  transport: { name: 'Safetrax – employee transport ₹3,500–10,000 per employee per month in Indian IT/BPO', url: 'https://www.safetrax.in/blog/4-ways-to-reduce-the-transport-cost-per-employee/' },
  attrition: { name: 'Zinnov / ANSR – India GCC attrition ≈16–17% overall in 2024–25 (voluntary 12.6%)', url: 'https://zinnov.com/global-talent/salary-increase-attrition-and-hiring-trends-an-india-gcc-view-2025-report/' },
  managed: { name: 'Office Hub / BangaloreOffice – managed office ₹8,000–15,000 per seat mid-market; ₹12,000–20,000 Grade A (2025–26)', url: 'https://bangaloreoffice.com/office-space-rent-in-bangalore-2026-area-wise-price-guide-per-sq-ft-per-seat/' },
  coworking: { name: 'myHQ – dedicated desks in Bangalore ₹9,000–18,000 per month (2026); city average ₹7,500–10,000', url: 'https://myhq.in/blog/office-space/coworking-space-cost-in-bangalore/' },
  rent: { name: 'Cushman & Wakefield Q3 2025 via GoodWorks – Grade A asking rent ORR ≈ ₹104.5, Whitefield ≈ ₹72 per sq ft per month', url: 'https://www.goodworks.in/whitefield-vs-outer-ring-road-vs-north-bangalore-for-gccs-a-location-strategy-guide-for-ceos-cfos-and-ctos/' },
  cam: { name: 'myHQ / BangaloreOffice – CAM ₹20–40 per sq ft per month in commercial buildings', url: 'https://myhq.in/blog/office-space/hidden-costs-in-commercial-office-leasing-bangalore/' },
  utilities: { name: 'Beacon Filing – 5,000 sq ft office electricity ₹60,000–1,20,000 per month (≈ ₹12–24 per sq ft)', url: 'https://beaconfiling.com/blog/moving-into-india-office-utilities-setup' },
  fitout: { name: 'Cushman & Wakefield Office Fit-Out Cost Guide – Bengaluru ≈ USD 67 per sq ft', url: 'https://www.cushmanwakefield.com/en/india/insights/office-fit-out-cost-guide' },
  density: { name: 'AirBrick Infra / JLL – 70–90 sq ft per employee for product teams, 90–120 for Grade A corporate offices in India', url: 'https://blogs.airbrickinfra.com/how-much-office-space-do-you-actually-need-sq-ft-per-employee-benchmarks-for-india/' },
  lease: { name: 'Sadhwani / Veritas Legal – Bangalore commercial deposits 6–12 months; 6-month rent-free fit-out period standard in large Grade A leases; escalation 5–15% every 3 years', url: 'https://sadhwani.co.in/blog/what-to-check-before-signing-a-commercial-lease-in-bangalore-lock-in-escalation-deposit-and-the-clauses-that-cost-you' },
  parking: { name: 'Draft Greater Bengaluru Area (Parking) Rules 2026 – commercial off-street parking ₹1,000–4,000 per car per month', url: 'https://tradebrains.in/money/bengaluru-parking-rules-2026-you-may-soon-pay-15000-25000-to-park-your-car-outside-your-home/' },
  m365: { name: 'Microsoft 365 E3 – ≈ USD 36–39 per user per month (₹2,250–2,995 in India before GST)', url: 'https://www.cloudfysystems.com/blog/microsoft-365-enterprise-india' },
  laptop: { name: 'Smartprix / 91mobiles – business laptops ₹73,000–1,30,000 in India (2026)', url: 'https://www.smartprix.com/laptops/utility-business' },
  euc: { name: 'IT Budget Calculator – end-user device fully loaded $1,200–2,500 per employee per year; 3–4 year refresh', url: 'https://itbudgetcalculator.com/it-hardware-budget' },
  compliance: { name: 'Kanakkupillai / IncorpX – foreign-subsidiary annual compliance ₹2–5 lakh (statutory audit, transfer pricing, ROC, tax, GST)', url: 'https://www.kanakkupillai.com/learn/annual-compliance-for-foreign-subsidiary-company-in-india/' },
  setup: { name: 'VJM Global / Wisemonk – entity incorporation and registrations USD 5,000–25,000; HR and compliance $50,000–100,000 per year', url: 'https://www.wisemonk.io/blogs/cost-of-setting-up-a-gcc-in-india' },
  fx: { name: 'Trading Economics – USD/INR 95.98 on 24 September 2026', url: 'https://tradingeconomics.com/india/currency' },
  assumption: { name: 'Future Factor planning assumption – no public benchmark found; validate with client or vendor quotes', url: '' },
};

// GCC compensation: public reports quote CTC (cost to company). Base salary here = CTC ÷ 1.25,
// since the model adds variable pay, allowances and benefits on top of base.
const ctcToBase = (ctcLakhs) => inr(ctcLakhs * 100000 / 1.25);

export const BENCHMARK_LIBRARY = {
  'india-usd': {
    label: 'India GCC · USD · researched Sep 2026',
    currency: 'USD',
    fx: FX,
    asOf: '24 September 2026',
    entries: {
      // ---- Compensation ----
      'compensation.bands.0.base': { value: ctcToBase(12), basis: '0–3 yrs: GCC captives pay ₹10–22L CTC; midpoint ₹12L ÷ 1.25', source: S.gccSalary },
      'compensation.bands.1.base': { value: ctcToBase(20), basis: '3–6 yrs: ₹12–28L CTC in GCCs; midpoint ₹20L ÷ 1.25', source: S.gccSalary },
      'compensation.bands.2.base': { value: ctcToBase(35), basis: '6–10 yrs: ₹25–45L CTC; midpoint ₹35L ÷ 1.25', source: S.gccSalary },
      'compensation.bands.3.base': { value: ctcToBase(60), basis: '10–15 yrs: ₹40–80L CTC; midpoint ₹60L ÷ 1.25', source: S.gccSalary },
      'compensation.bands.4.base': { value: ctcToBase(100), basis: '15+ yrs: ₹70L–1.5Cr CTC for directors; ₹1Cr ÷ 1.25', source: S.gccSalary },
      'compensation.bands.0.variablePct': { value: 10, basis: 'IT variable pay 10–20% of CTC; junior end', source: S.variable },
      'compensation.bands.1.variablePct': { value: 10, basis: 'IT variable pay 10–20% of CTC', source: S.variable },
      'compensation.bands.2.variablePct': { value: 12, basis: 'IT variable pay 10–20% of CTC; senior ICs', source: S.variable },
      'compensation.bands.3.variablePct': { value: 15, basis: 'Managers 15–20%', source: S.variable },
      'compensation.bands.4.variablePct': { value: 20, basis: 'Senior management 20–30%', source: S.variable },
      'compensation.bands.0.allowancePct': { value: 5, basis: 'Flexible benefits, meal/telephone allowances outside base', source: S.assumption },
      'compensation.bands.1.allowancePct': { value: 5, basis: 'Flexible benefits, meal/telephone allowances outside base', source: S.assumption },
      'compensation.bands.2.allowancePct': { value: 5, basis: 'Flexible benefits, meal/telephone allowances outside base', source: S.assumption },
      'compensation.bands.3.allowancePct': { value: 5, basis: 'Flexible benefits, meal/telephone allowances outside base', source: S.assumption },
      'compensation.bands.4.allowancePct': { value: 5, basis: 'Flexible benefits, meal/telephone allowances outside base', source: S.assumption },
      'compensation.basicPct': { value: 50, basis: 'Code on Wages minimum basic 50% of wages', source: S.basic },
      'compensation.escalation': { value: 9.9, basis: 'GCC salary increase projected 9.9% (2025); India overall 9.1% (2026)', source: S.aon },
      'compensation.benefits.epf': { value: 12, basis: 'Employer provident fund contribution, % of basic', source: S.statutory },
      'compensation.benefits.gratuity': { value: 4.81, basis: 'Gratuity accrual, % of basic', source: S.statutory },
      'compensation.benefits.medical': { value: inr(15000), basis: '₹15,000 employer-borne family floater premium per employee per year', source: S.medical },
      'compensation.benefits.life': { value: inr(3500), basis: '₹3,500 group term life + personal accident per employee per year', source: S.assumption },
      'compensation.benefits.learning': { value: 400, basis: '≈1.5% of average GCC employee cost; global benchmark $874 per learner', source: S.ld },
      'compensation.benefits.engagement': { value: inr(12000), basis: '₹12,000 per employee per year for wellness and engagement programs', source: S.assumption },
      'compensation.benefits.otherBenefits': { value: inr(24000), basis: '₹2,000 per month meals, telecom and similar per employee', source: S.assumption },
      // ---- Other people costs ----
      'otherPeople.hiring.agency': { value: 2500, basis: '≈10% of a blended $25,000 CTC (agency fees 8.33–16.67%)', source: S.agency },
      'otherPeople.hiring.agency.eligibility': { value: 50, basis: 'Share of hires sourced through agencies; rest via referrals and direct sourcing', source: S.assumption },
      'otherPeople.hiring.bgv': { value: inr(2500), basis: '₹2,500 standard corporate verification package', source: S.bgv },
      'otherPeople.hiring.medicalCheck': { value: inr(1500), basis: '₹1,500 pre-employment health check', source: S.assumption },
      'otherPeople.hiring.signOn': { value: 2000, basis: '≈8% of CTC where offered', source: S.assumption },
      'otherPeople.hiring.signOn.eligibility': { value: 20, basis: 'Share of hires receiving a sign-on bonus', source: S.assumption },
      'otherPeople.hiring.relocation': { value: inr(100000), basis: '₹1 lakh mid-level relocation allowance', source: S.relocation },
      'otherPeople.hiring.relocation.eligibility': { value: 15, basis: 'Share of hires relocating from another city', source: S.assumption },
      'otherPeople.hiring.onboarding': { value: 300, basis: 'Induction, initial training and onboarding kit per hire', source: S.assumption },
      'otherPeople.operating.transport': { value: inr(6000 * 12), basis: '₹6,000 per month shared cab cost for employees who use transport', source: S.transport },
      'otherPeople.operating.transport.eligibility': { value: 40, basis: 'Share of employees on company transport', source: S.assumption },
      'otherPeople.operating.travel': { value: 600, basis: 'Domestic and onsite travel per FTE per year, blended', source: S.assumption },
      'otherPeople.operating.events': { value: 150, basis: 'Team events, townhalls, offsites per FTE per year', source: S.assumption },
      'otherPeople.operating.rewards': { value: 150, basis: 'Rewards and recognition budget per FTE per year', source: S.assumption },
      'otherPeople.center.recruitBrand': { value: 25000, basis: 'Job boards, campus, employer-brand campaigns per center per year', source: S.assumption },
      'otherPeople.center.careerDev': { value: 15000, basis: 'Leadership and career programs per center per year', source: S.assumption },
      'otherPeople.center.otherPeopleCost': { value: 10000, basis: 'Miscellaneous people programs per center per year', source: S.assumption },
      'otherPeople.escalation': { value: 6, basis: 'Services inflation in India (transport, vendors)', source: S.assumption },
      // ---- Real estate: managed office ----
      'realEstate.managed.seatCost': { value: inr(14000), basis: '₹14,000 per seat per month Grade A managed office in Bengaluru (₹12,000–20,000 range)', source: S.managed },
      'realEstate.managed.seatsPct': { value: 80, basis: 'Hybrid working: 80 seats per 100 employees', source: S.density },
      'realEstate.managed.setupPerSeat': { value: 200, basis: 'Branding, access and cabling per seat on top of the provider fit-out', source: S.assumption },
      'realEstate.managed.depositMonths': { value: 3, basis: 'Managed office deposits 2–6 months', source: S.lease },
      'realEstate.managed.parkingRatio': { value: 5, basis: 'One car bay per five employees', source: S.assumption },
      'realEstate.managed.parkingCost': { value: inr(3000), basis: '₹3,000 per car per month commercial parking', source: S.parking },
      'realEstate.managed.escalation': { value: 5, basis: 'Annualised: 5–15% step every 3 years', source: S.lease },
      // ---- Real estate: coworking ----
      'realEstate.coworking.deskCost': { value: inr(11000), basis: '₹11,000 dedicated desk per month, Bangalore business districts', source: S.coworking },
      'realEstate.coworking.seatsPct': { value: 70, basis: 'Hot-desking models run at 60–80% desks per employee', source: S.coworking },
      'realEstate.coworking.extrasPerFte': { value: 10, basis: 'Meeting-room credits and printing per FTE per month', source: S.assumption },
      'realEstate.coworking.setupPerDesk': { value: 50, basis: 'Membership onboarding and access per desk', source: S.assumption },
      'realEstate.coworking.depositMonths': { value: 2, basis: 'Coworking deposits 1–3 months', source: S.lease },
      'realEstate.coworking.escalation': { value: 5, basis: 'Membership fee escalation', source: S.lease },
      // ---- Real estate: conventional lease ----
      'realEstate.lease.areaPerFte': { value: 85, basis: '70–90 sq ft per employee product teams; 90–120 Grade A corporate', source: S.density },
      'realEstate.lease.seatsPct': { value: 80, basis: 'Hybrid working: 80 seats per 100 employees', source: S.density },
      'realEstate.lease.rentPerSqft': { value: Number((90 / FX).toFixed(2)), basis: '₹90 per sq ft per month blended Grade A (ORR ₹104.5, Whitefield ₹72)', source: S.rent },
      'realEstate.lease.camPerSqft': { value: Number((25 / FX).toFixed(2)), basis: '₹25 per sq ft per month CAM (₹20–40 range)', source: S.cam },
      'realEstate.lease.utilitiesPerSqft': { value: Number((15 / FX).toFixed(2)), basis: '₹15 per sq ft per month power, HVAC and housekeeping', source: S.utilities },
      'realEstate.lease.fitoutPerSqft': { value: 67, basis: 'Bengaluru fit-out ≈ USD 67 per sq ft', source: S.fitout },
      'realEstate.lease.rentFreeMonths': { value: 6, basis: 'Six-month rent-free fit-out period standard in large Grade A leases', source: S.lease },
      'realEstate.lease.depositMonths': { value: 6, basis: 'Six months of rent standard; 6–12 months range', source: S.lease },
      'realEstate.lease.parkingRatio': { value: 5, basis: 'One car bay per five employees', source: S.assumption },
      'realEstate.lease.parkingCost': { value: inr(3000), basis: '₹3,000 per car per month commercial parking', source: S.parking },
      'realEstate.lease.escalation': { value: 5, basis: 'Annualised: 15% every 3 years ≈ 4.8% per year', source: S.lease },
      // ---- Technology ----
      'technology.device': { value: inr(90000), basis: '₹90,000 business laptop with dock and peripherals', source: S.laptop },
      'technology.collab': { value: 36, basis: 'Microsoft 365 E3 per user per month', source: S.m365 },
      'technology.apps': { value: 40, basis: 'Blended enterprise application seats (ERP, CRM, engineering tools)', source: S.assumption },
      'technology.cloud': { value: 35, basis: 'Cloud infrastructure, storage and backup allocated per user', source: S.assumption },
      'technology.security': { value: 15, basis: 'Endpoint, identity and monitoring tooling per user', source: S.euc },
      'technology.support': { value: 20, basis: 'India service desk and on-site support ≈ ₹2,000 per user per month', source: S.assumption },
      'technology.network': { value: 10, basis: 'Internet, SD-WAN and telco per user per month', source: S.assumption },
      'technology.datacenter': { value: 5, basis: 'Residual hosting for cloud-first centers', source: S.assumption },
      'technology.refreshYears': { value: 3, basis: '3–4 year device refresh', source: S.euc },
      'technology.escalation': { value: 5, basis: 'Licensing price increases (Microsoft raised M365 prices in 2025)', source: S.m365 },
      // ---- Corporate ----
      'corporate.compliance': { value: inr(350000), basis: '₹3.5 lakh annual statutory compliance for a foreign subsidiary (₹2–5 lakh)', source: S.compliance },
      'corporate.finance': { value: 30000, basis: 'Outsourced payroll, accounting and finance operations per center', source: S.setup },
      'corporate.legalTax': { value: 12000, basis: 'Statutory and transfer-pricing audits plus legal advisory', source: S.compliance },
      'corporate.insurance': { value: 15000, basis: 'Business, liability and property insurance per center', source: S.assumption },
      'corporate.governance': { value: 25000, basis: 'Center administration, office management, governance forums', source: S.setup },
      'corporate.overhead': { value: 10000, basis: 'Miscellaneous corporate overhead', source: S.assumption },
      'corporate.escalation': { value: 5, basis: 'Professional-services inflation', source: S.assumption },
      // ---- Establishment ----
      'establishment.legal': { value: 15000, basis: 'Entity incorporation, registrations and approvals USD 5,000–25,000', source: S.setup },
      'establishment.policies': { value: 20000, basis: 'HR, finance and compliance policy set-up (advisory)', source: S.assumption },
      'establishment.branding': { value: 25000, basis: 'Employer brand launch and initial recruitment campaigns', source: S.assumption },
      'establishment.travel': { value: 60000, basis: 'Stakeholder travel and knowledge transfer during launch', source: S.assumption },
      'establishment.program': { value: 75000, basis: 'GCC set-up program and transition management', source: S.setup },
      'establishment.contingency': { value: 20000, basis: '≈10% of other establishment items', source: S.assumption },
      // ---- Settings ----
      'settings.attritionPct': { value: 16, basis: 'India GCC overall attrition ≈16–17%', source: S.attrition },
    },
  },
};

export const librarySources = (lib) => {
  const seen = new Map();
  Object.values(lib.entries).forEach((e) => { if (e.source?.name && !seen.has(e.source.name)) seen.set(e.source.name, e.source); });
  seen.set(S.fx.name, S.fx);
  return [...seen.values()];
};

export const libraryValues = (lib) => Object.fromEntries(Object.entries(lib.entries).map(([k, e]) => [k, e.value]));
