import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons.jsx';
import { symbolFor, signedPct } from '../model/format.js';

const BADGE_COLORS = ['#1f6fd1', '#1baf7a', '#eb6834', '#7b4fd1', '#d03b3b', '#1f6fd1', '#1baf7a', '#eb6834', '#7b4fd1', '#d03b3b', '#1f6fd1', '#1baf7a'];
const has = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export function Panel({ title, subtitle, icon, actions, children, className = '', tight = false }) {
  return (
    <section className={`panel ${tight ? 'tight' : ''} ${className}`}>
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h3>{icon && <Icon name={icon} />}{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ icon, label, value, sub, delta }) {
  return (
    <div className="kpi">
      <div className="kpi-icon"><Icon name={icon} /></div>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {(sub || delta) && (
          <div className="kpi-sub">
            {delta && <span className={`delta ${delta.good ? 'up' : 'down'}`}>{delta.text}</span>}
            {sub && <span>{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function Callout({ tone = '', icon = 'info', title, children, action }) {
  return (
    <div className={`callout ${tone}`}>
      <Icon name={icon} />
      <div style={{ flex: 1 }}>{title && <strong>{title}</strong>}<span>{children}</span></div>
      {action}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(([key, label]) => <button key={key} type="button" className={key === value ? 'on' : ''} onClick={() => onChange(key)}>{label}</button>)}
    </div>
  );
}

export function ModeBar({ label = 'Input mode', modes, mode, onMode, rate, onRate, benchRate, onBenchRate, rateLabel = 'Annual escalation rate', rateNote = 'applied in escalation mode' }) {
  return (
    <div className="mode-bar">
      <span className="label">{label}</span>
      <Segmented options={modes} value={mode} onChange={onMode} />
      <span className="spacer" />
      {onRate && (
        <div className="rate">
          <span>{rateLabel}</span>
          <NumField value={rate} onChange={onRate} suffix="%" size="narrow" disabled={mode !== 'escalate'} />
          {onBenchRate && <><span className="muted" style={{ fontWeight: 500 }}>industry avg</span><NumField value={benchRate} onChange={onBenchRate} suffix="%" size="narrow bench" placeholder="—" /></>}
          <span className="muted" style={{ fontWeight: 500 }}>{rateNote}</span>
        </div>
      )}
    </div>
  );
}

const fmtIn = (v, decimals) => (has(v) ? Number(v).toLocaleString('en-US', { maximumFractionDigits: decimals }) : '');

// Numeric input. Empty means "not entered" (null). Thousands grouping when blurred, raw text while editing.
export function NumField({ value, onChange, prefix, suffix, currency, size = '', disabled = false, readOnly = false, decimals = 2, min = 0, ariaLabel, placeholder = '' }) {
  const [text, setText] = useState(fmtIn(value, decimals));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(fmtIn(value, decimals)); }, [value, focused, decimals]);
  const commit = (raw) => {
    const cleaned = raw.replace(/,/g, '').trim();
    if (cleaned === '') { onChange(null); return; }
    if (cleaned === '-' || cleaned === '.') return;
    const n = Number(cleaned);
    if (Number.isFinite(n)) onChange(min !== null && n < min ? min : n);
  };
  const pre = prefix === 'currency' ? symbolFor(currency) : prefix;
  const ro = readOnly || disabled;
  return (
    <span className={`num-input ${size} ${ro ? 'readonly' : ''} ${!has(value) && !ro ? 'empty' : ''}`}>
      {pre && <span className="affix">{pre}</span>}
      <input
        type="text" inputMode="decimal" aria-label={ariaLabel} value={text} readOnly={ro} placeholder={placeholder}
        onFocus={(e) => { setFocused(true); setText(has(value) ? String(Number(value)) : ''); requestAnimationFrame(() => e.target.select && e.target.select()); }}
        onBlur={() => { setFocused(false); commit(text); }}
        onChange={(e) => { setText(e.target.value); commit(e.target.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
      />
      {suffix && <span className="affix after">{suffix}</span>}
    </span>
  );
}

// Industry-average reference input (editable, muted).
export function Bench({ value, onChange, prefix, suffix, currency, decimals = 2, ariaLabel }) {
  return <NumField value={value} onChange={onChange} prefix={prefix} suffix={suffix} currency={currency} decimals={decimals} size="bench" ariaLabel={ariaLabel} placeholder="—" />;
}

// "+12% vs avg" chip; neutral colouring, no judgement.
export function VsAvg({ value, avg }) {
  if (!has(value) || !has(avg) || Number(avg) === 0) return <span className="muted">—</span>;
  const d = (Number(value) / Number(avg) - 1) * 100;
  if (Math.abs(d) < 0.05) return <span className="vs same">at avg</span>;
  return <span className={`vs ${d > 0 ? 'above' : 'below'}`}>{signedPct(d, 0)}</span>;
}

export function RowBadge({ index }) {
  return <span className="row-badge" style={{ background: BADGE_COLORS[index % BADGE_COLORS.length] }}>{index + 1}</span>;
}

// Standard assumption table: # | Parameter | Your input | Industry average | vs avg | Unit | What this means
export function AssumptionTable({ title = 'Assumption inputs', subtitle, rows, currency, getValue, setValue, getBench, setBench, actions, renderInput }) {
  return (
    <Panel title={title} subtitle={subtitle} tight actions={actions}>
      <div className="table-wrap">
        <table className="assumptions">
          <thead>
            <tr>
              <th style={{ width: 44 }}>#</th>
              <th>Parameter</th>
              <th>Your input</th>
              <th>Industry average</th>
              <th>vs avg</th>
              <th>Unit</th>
              <th>What this means</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const decimals = row.decimals ?? 2;
              return (
                <tr key={row.key}>
                  <td><RowBadge index={i} /></td>
                  <td><span className="name">{row.name}</span></td>
                  <td>{renderInput ? renderInput(row, i) : <NumField value={getValue(row)} onChange={(v) => setValue(row, v)} prefix={row.prefix} suffix={row.suffix} currency={currency} decimals={decimals} size="wide" ariaLabel={row.name} />}</td>
                  <td><Bench value={getBench(row)} onChange={(v) => setBench(row, v)} prefix={row.prefix} suffix={row.suffix} currency={currency} decimals={decimals} ariaLabel={`${row.name} industry average`} /></td>
                  <td className="nowrap"><VsAvg value={getValue(row)} avg={getBench(row)} /></td>
                  <td className="muted nowrap">{row.unit?.replace('currency', symbolFor(currency))}</td>
                  <td><div className="meaning">{row.meaning}</div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function FillButton({ onClick, label = 'Fill empty inputs from industry average' }) {
  return <button type="button" className="btn sm" onClick={onClick}><Icon name="import" size={14} />{label}</button>;
}

export function YearHeaders({ years, extra = [] }) {
  return (
    <>
      {years.map((y) => <th key={y.index} className="num">{y.label}<small>{y.year}</small></th>)}
      {extra.map((e) => <th key={e} className="num">{e}</th>)}
    </>
  );
}

export function StatusCheck({ ok, okText = 'OK', errText = 'Check' }) {
  return <span className={`check ${ok ? 'ok' : 'err'}`}><Icon name={ok ? 'check' : 'alert'} />{ok ? okText : errText}</span>;
}

export function Menu({ trigger, children, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && <div className="menu" style={align === 'left' ? { left: 0, right: 'auto' } : undefined} onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
}

export function Insights({ items, columns }) {
  return (
    <div className="insights" style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}>
      {items.map((it, i) => <div className="insight" key={i}><Icon name={it.icon || 'trend'} /><div>{it.text}</div></div>)}
    </div>
  );
}

export function Dialog({ dialog, onClose }) {
  const [value, setValue] = useState(dialog?.defaultValue ?? '');
  useEffect(() => { setValue(dialog?.defaultValue ?? ''); }, [dialog]);
  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, onClose]);
  if (!dialog) return null;
  const isPrompt = dialog.type === 'prompt';
  const submit = (e) => { e.preventDefault(); onClose(isPrompt ? (value.trim() || null) : true); };
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(null); }}>
      <form className="dialog" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <h3 id="dialog-title">{dialog.title}</h3>
        {dialog.message && <p>{dialog.message}</p>}
        {isPrompt && <input id="dialog-input" className="text-input" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={dialog.placeholder || ''} />}
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => onClose(null)}>Cancel</button>
          <button type="submit" className={`btn ${dialog.danger ? 'danger' : 'primary'}`} disabled={isPrompt && !value.trim()}>{dialog.confirmLabel || 'OK'}</button>
        </div>
      </form>
    </div>
  );
}

export function Swatch({ color, round }) { return <i className={`swatch ${round ? 'round' : ''}`} style={{ background: color }} />; }

export function Field({ label, hint, children, wide }) {
  return <label className={`field ${wide ? 'wide' : ''}`}>{label}{children}{hint && <small className="hint">{hint}</small>}</label>;
}
