import { useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { Menu } from './ui.jsx';

// The Future Factor logo as supplied, served from public/logo.png. No recreation.
export function Logo({ height = 40 }) {
  const [missing, setMissing] = useState(false);
  const src = `${import.meta.env.BASE_URL}logo.png`;
  if (missing) return <div className="logo-missing" style={{ height }} title="Add public/logo.png">FUTURE FACTOR</div>;
  return <img className="logo-img" src={src} alt="Future Factor" style={{ height }} onError={() => setMissing(true)} />;
}

// Input steps in order, then outputs.
export const INPUT_NAV = [
  { key: 'setup', label: 'Case setup', icon: 'doc', step: 1, pages: [], statusKeys: ['setup'] },
  { key: 'headcount', label: 'Headcount', icon: 'people', step: 2, pages: [['plan', 'Headcount plan']], statusKeys: ['headcount'] },
  { key: 'people', label: 'People costs', icon: 'coins', step: 3, pages: [['compensation', 'Compensation'], ['other', 'Other people costs']], statusKeys: ['compensation', 'other'] },
  { key: 'realEstate', label: 'Real estate', icon: 'building', step: 4, pages: [['strategy', 'Strategy & type'], ['assumptions', 'Assumptions']], statusKeys: ['realEstate'] },
  { key: 'technology', label: 'Technology', icon: 'monitor', step: 5, pages: [['assumptions', 'Assumptions']], statusKeys: ['technology'] },
  { key: 'center', label: 'Center operations', icon: 'gear', step: 6, pages: [['corporate', 'Corporate costs'], ['establishment', 'One-time establishment']], statusKeys: ['corporate', 'establishment'] },
];
export const OUTPUT_NAV = [
  { key: 'summaries', label: 'Module summaries', icon: 'layers', pages: [['headcount', 'Headcount'], ['people', 'People costs'], ['realEstate', 'Real estate'], ['technology', 'Technology'], ['center', 'Center operations']] },
  { key: 'results', label: 'Business case results', icon: 'chart', pages: [['summary', 'Executive summary'], ['breakdown', 'Cost breakdown'], ['annual', 'Annual view'], ['perFte', 'Per-FTE view'], ['cashflow', 'Cash flow']] },
  { key: 'sensitivity', label: 'Scenarios & sensitivity', icon: 'sliders', pages: [['scenarios', 'Scenario comparison'], ['analysis', 'Sensitivity analysis']] },
];
export const NAV = [...INPUT_NAV, ...OUTPUT_NAV];

// Flat page order for Back / Next.
export const PAGE_ORDER = [
  ...INPUT_NAV.flatMap((m) => (m.pages.length ? m.pages.map(([p]) => ({ module: m.key, page: p })) : [{ module: m.key, page: null }])),
  { module: 'summaries', page: 'headcount' },
];

const combine = (statuses) => (statuses.every((s) => s === 'done') ? 'done' : statuses.some((s) => s !== 'empty') ? 'partial' : 'empty');
export const moduleStatus = (item, status) => combine(item.statusKeys.map((k) => status[k]));

export function Sidebar({ nav, go, status }) {
  const group = (items, title, showStatus) => (
    <div className="nav-section">
      <div className="nav-title">{title}</div>
      {items.map((item) => {
        const active = nav.module === item.key;
        const st = showStatus ? moduleStatus(item, status) : null;
        return (
          <div className="nav-group" key={item.key}>
            <button type="button" className={`nav-item ${active ? 'active' : ''} ${active && item.pages.length ? 'open' : ''}`} onClick={() => go(item.key, item.pages[0]?.[0])}>
              {showStatus ? <span className={`step-dot ${st}`}>{st === 'done' ? <Icon name="check" size={11} /> : item.step}</span> : <Icon name={item.icon} />}
              {item.label}
              {item.pages.length > 0 && <Icon name="chevron" className="chev" />}
            </button>
            {active && item.pages.length > 0 && (
              <div className="nav-sub">
                {item.pages.map(([pk, pl]) => <button type="button" key={pk} className={nav.page === pk ? 'active' : ''} onClick={() => go(item.key, pk)}>{pl}</button>)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  return (
    <aside className="sidebar">
      <div className="brand"><Logo height={44} /></div>
      <nav className="nav">
        {group(INPUT_NAV, 'Build the case · inputs', true)}
        {group(OUTPUT_NAV, 'Decide · outputs', false)}
      </nav>
      <div className="sidebar-foot">
        <div className="tagline">Build.<br />Model.<br />Compare.<br />Decide.</div>
        <small>Future Factor 360 · GCC Business Case Builder</small>
      </div>
    </aside>
  );
}

export function TopBar({ model, workspace, dirty, actions, user, results }) {
  const fileRef = useRef(null);
  const active = workspace.scenarios.find((s) => s.id === workspace.activeId);
  const initials = (user?.email || 'FF').split('@')[0].split(/[._-]/).map((p) => p[0]?.toUpperCase()).join('').slice(0, 2) || 'FF';
  const s = model.settings;
  const parts = [s.companyName || 'New business case', s.gccName, s.country, `${results.N}-year model`, `${s.currency} (constant)`].filter(Boolean);
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>GCC Business Case Builder</h1>
        <p>{parts.map((p, i) => <span key={i}>{i > 0 && <span className="sep">|</span>}{i === 0 ? <b>{p}</b> : p}</span>)}</p>
      </div>
      <div className="top-actions">
        <label className="scenario-select">
          <Icon name="layers" size={16} />
          <select value={workspace.activeId} onChange={(e) => actions.switchScenario(e.target.value)} aria-label="Active scenario">
            {workspace.scenarios.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
        </label>
        <button type="button" className="btn" onClick={actions.save} title={dirty ? 'Unsaved changes' : 'All changes saved'}><Icon name="save" size={16} />Save{dirty && <span className="dot" aria-label="Unsaved changes" />}</button>
        <button type="button" className="btn hide-sm" onClick={() => actions.go('sensitivity', 'scenarios')}><Icon name="compare" size={16} />Compare</button>
        <Menu trigger={(toggle) => <button type="button" className="btn hide-sm" onClick={toggle}><Icon name="export" size={16} />Export</button>}>
          <div className="menu-label">Export “{active?.name}”</div>
          <button type="button" onClick={actions.exportCsv}><Icon name="doc" size={16} />Results as CSV</button>
          <button type="button" onClick={actions.exportJson}><Icon name="doc" size={16} />Assumptions as JSON</button>
          <button type="button" onClick={() => window.print()}><Icon name="print" size={16} />Print / save as PDF</button>
        </Menu>
        <Menu trigger={(toggle) => <button type="button" className="btn-icon" onClick={toggle} aria-label="More actions"><Icon name="more" size={18} /></button>}>
          <div className="menu-label">Scenarios</div>
          <button type="button" onClick={() => actions.go('sensitivity', 'scenarios')}><Icon name="compare" size={16} />Compare scenarios</button>
          <button type="button" onClick={actions.newScenario}><Icon name="plus" size={16} />New scenario from current</button>
          <button type="button" onClick={() => actions.renameScenario()}><Icon name="edit" size={16} />Rename scenario</button>
          <button type="button" onClick={actions.resetScenario}><Icon name="reset" size={16} />Clear all inputs in this scenario</button>
          <button type="button" className="danger" onClick={() => actions.deleteScenario()} disabled={workspace.scenarios.length < 2}><Icon name="trash" size={16} />Delete scenario</button>
          <hr />
          <button type="button" onClick={() => fileRef.current?.click()}><Icon name="import" size={16} />Import assumptions (JSON)</button>
          <button type="button" onClick={actions.exportCsv}><Icon name="doc" size={16} />Export results as CSV</button>
          <button type="button" onClick={actions.exportJson}><Icon name="doc" size={16} />Export assumptions as JSON</button>
          <hr />
          <button type="button" onClick={actions.signOut}><Icon name="logout" size={16} />Sign out</button>
        </Menu>
        <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) actions.importJson(f); e.target.value = ''; }} />
        <div className="avatar" title={user?.email}>{initials}</div>
      </div>
    </header>
  );
}

export function PageHeader({ icon, eyebrow, title, description, currency, step }) {
  return (
    <div className="page-head">
      <div className="page-head-left">
        <div className="page-icon">{step ? <span className="page-step">{step}</span> : <Icon name={icon} />}</div>
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {currency && <div className="chip"><b>{currency}</b>(Constant)</div>}
    </div>
  );
}

// Progress strip across the six input steps.
export function Stepper({ nav, status, go }) {
  return (
    <div className="stepper">
      {INPUT_NAV.map((item) => {
        const st = moduleStatus(item, status);
        const active = nav.module === item.key;
        return (
          <button type="button" key={item.key} className={`stepper-item ${active ? 'active' : ''} ${st}`} onClick={() => go(item.key, item.pages[0]?.[0])}>
            <span className="step-dot">{st === 'done' ? <Icon name="check" size={11} /> : item.step}</span>
            <span className="stepper-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Back / Next at the bottom of every input page.
export function StepNav({ nav, go }) {
  const idx = PAGE_ORDER.findIndex((p) => p.module === nav.module && (p.page === nav.page || (!p.page && !nav.page)));
  const prev = idx > 0 ? PAGE_ORDER[idx - 1] : null;
  const next = idx >= 0 && idx < PAGE_ORDER.length - 1 ? PAGE_ORDER[idx + 1] : null;
  const label = (p) => { const m = NAV.find((n) => n.key === p.module); const pg = m?.pages.find(([k]) => k === p.page); return pg ? `${m.label} · ${pg[1]}` : m?.label; };
  return (
    <div className="step-nav">
      {prev ? <button type="button" className="btn" onClick={() => go(prev.module, prev.page)}>← {label(prev)}</button> : <span />}
      {next && <button type="button" className="btn primary" onClick={() => go(next.module, next.page)}>{next.module === 'summaries' ? 'See the outputs' : `Next: ${label(next)}`} →</button>}
    </div>
  );
}
