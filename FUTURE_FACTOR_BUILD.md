# Future Factor 360 · GCC Business Case Builder

A guided, input-first business case tool for setting up a Global Capability Center (GCC). A company starts from a blank case, works through six input steps, and then reviews the outputs: module summaries, consolidated results, cash flow, scenario comparison and driver sensitivity.

Built with React 19 and Vite. No backend; everything stays in the browser. Not hosted anywhere.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

Sign in with any `@futurefactor360.com` email and any password (a prototype domain gate, not authentication).

The Future Factor logo is served from `public/logo.png` exactly as supplied.

## The flow

Every input starts empty. Nothing is pre-filled. The sidebar and the progress strip show each step as empty, partial or done.

| Step | Screen | What is captured |
|---|---|---|
| 1 | Case setup | Company, GCC name, objective, plan description, country, city, currency (18 major currencies), horizon (3–10 years), first model year, attrition backfill. Also loads or clears industry-average reference values and holds the workspace actions. |
| 2 | Headcount | Exit headcount per year (with an optional ramp generator: start, target, growth profile), experience mix by band and year. |
| 3 | People costs | Compensation by band (base, variable %, allowances %, escalation, base by year), statutory and other benefits, and other people costs (hiring, employee operating, center-level). |
| 4 | Real estate | Strategy page: choose managed office, coworking / flexible space, or conventional lease (bare shell + fit-out), each with a description and best-fit guidance, plus a free-text plan. Assumptions page: only the inputs relevant to the chosen type. |
| 5 | Technology | Devices, licenses, cloud, security, support, network, data center, refresh cycle, escalation. |
| 6 | Center operations | Recurring corporate costs and one-time establishment costs. |

Outputs: module summaries (headcount, people, real estate, technology, center operations), business case results (executive summary, cost breakdown, annual view, per-FTE view, cash flow) and scenarios & sensitivity.

## Industry averages

Every input table has an **Industry average** column beside the input and a **vs avg** chip showing the percentage difference. The averages are editable reference values stored per scenario. On the setup page you can load an indicative set (values taken from the reference GCC business-case material, India/USD, clearly marked indicative) or clear them. Each input page has a "Fill empty inputs from industry average" action that copies averages only into inputs that are still empty.

## Calculation model

`src/model/engine.js` is pure JavaScript. `compute(model)` returns every figure shown. Empty inputs count as zero. The horizon (N years) is read from the settings and every array is sized to it.

- **Headcount**: opening = previous exit; average = (opening + exit) ÷ 2; new hires = net additions plus optional attrition backfill; the experience mix splits the average into five bands.
- **Compensation**: base × (1 + variable % + allowances %), plus benefits as % of basic (basic = configurable % of base) and per-employee benefits. Modes: same, annual escalation, customise by year.
- **Other people costs**: per new hire × eligibility × hires; per FTE × average headcount; fixed center-level.
- **Real estate** by type:
  - Managed office: seats × seat fee, parking, one-time setup per new seat, refundable deposit.
  - Coworking: desks × membership, extras per FTE, onboarding per new desk, deposit.
  - Conventional lease: area = seats × sq ft per seat; rent (with first-year rent-free months), CAM and utilities per sq ft, fit-out per new sq ft, parking, deposit on rent.
- **Technology**: recurring per user per month × average headcount; devices for net new hires, replaced after the refresh cycle.
- **Center operations**: corporate costs with optional escalation; establishment booked in Year 1.
- **Outputs**: six categories per year, operating vs one-time, cost per FTE, cash flow including refundable deposits, sensitivity by flexing each driver ± a chosen percentage.

## Persistence and exports

Scenarios save automatically to the browser. Export assumptions as JSON (moves a case between browsers), import JSON, export results as CSV, print to PDF. Scenario actions (new, rename, duplicate, delete, clear inputs) use in-page dialogs.

## Code layout

```
src/
  App.jsx                workspace state, routing, benchmark helpers, scenario actions
  styles.css
  model/defaults.js      model shape, catalogues, real estate types, currencies, benchmark library
  model/engine.js        calculation engine, step status, sensitivity
  model/storage.js       localStorage, normalisation, import / export
  model/format.js
  components/Shell.jsx   logo, navigation (inputs then outputs), stepper, back / next
  components/ui.jsx      panels, KPI cards, numeric and benchmark fields, assumption table, dialog
  components/charts.jsx  SVG charts
  screens/               Setup, Headcount, People, RealEstate, Technology, CenterOps, Summaries, Results, Sensitivity, Login
public/logo.png          Future Factor logo
```

## Known limits

- Single-user, browser-local storage; no accounts or sharing.
- Constant currency; the currency changes the symbol only, not the values.
- The bundled industry averages are indicative and must be validated or replaced with Future Factor benchmark data.
- Sign-in is a domain check only.
