// Inline SVG charts. Thin marks, hairline grid, hover tooltips, legends for >= 2 series.
import { useEffect, useRef, useState } from 'react';

const SURFACE = '#ffffff';
const BAR_MAX = 28;
const GAP = 2;

function useSize() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver((entries) => setW(entries[0].contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceMax(max, ticks = 4) {
  if (!(max > 0)) return { max: 1, step: 0.25 };
  const rough = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { max: Math.ceil(max / step) * step, step };
}

const compactAxis = (v) => {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(v % 1e6 === 0 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(v % 1e3 === 0 ? 0 : 1)}K`;
  return `${Math.round(v)}`;
};

function topRounded(x, y, w, h, r) {
  if (h <= 0 || w <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}

function Tip({ tip }) {
  if (!tip) return null;
  return (
    <div className="chart-tip" style={{ left: tip.x, top: tip.y }}>
      {tip.title && <div className="t">{tip.title}</div>}
      {tip.rows.map((r, i) => (
        <div className="r" key={i}><span>{r.color && <i style={{ background: r.color }} />}{r.name}</span><b>{r.value}</b></div>
      ))}
    </div>
  );
}

export function Legend({ series, line = false }) {
  if (!series || series.length < 2) return null;
  return (
    <div className="legend">
      {series.map((s) => <span key={s.name}><i className={s.line || line ? 'line' : ''} style={{ background: s.color }} />{s.name}</span>)}
    </div>
  );
}

function Frame({ height, children, legend }) {
  const [ref, width] = useSize();
  const [tip, setTip] = useState(null);
  return (
    <div className="chart" ref={ref}>
      {width > 0 && <svg width={width} height={height} role="img">{children(width, setTip)}</svg>}
      <Tip tip={tip} />
      {legend}
    </div>
  );
}

const axisMargin = { top: 26, right: 12, bottom: 38, left: 52 };

function Axes({ width, height, yMax, step, m, format }) {
  const ticks = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(v);
  const plotH = height - m.top - m.bottom;
  const yOf = (v) => m.top + plotH - (v / yMax) * plotH;
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid-line" x1={m.left} x2={width - m.right} y1={yOf(t)} y2={yOf(t)} />
          <text className="axis-text" x={m.left - 8} y={yOf(t) + 3.5} textAnchor="end">{(format || compactAxis)(t)}</text>
        </g>
      ))}
      <line className="baseline" x1={m.left} x2={width - m.right} y1={yOf(0)} y2={yOf(0)} />
    </g>
  );
}

function XLabels({ data, xOf, height, m }) {
  return (
    <g>
      {data.map((d, i) => (
        <g key={i}>
          <text className="axis-text" x={xOf(i)} y={height - m.bottom + 16} textAnchor="middle" style={{ fill: '#44546a', fontWeight: 600 }}>{d.label}</text>
          {d.sub && <text className="axis-text sub" x={xOf(i)} y={height - m.bottom + 29} textAnchor="middle">{d.sub}</text>}
        </g>
      ))}
    </g>
  );
}

// ---------- Stacked columns ----------
export function StackedColumns({ data, series, format, height = 260, showTotals = true, axisFormat, barMax = BAR_MAX }) {
  const totals = data.map((d) => d.values.reduce((t, v) => t + (v || 0), 0));
  const { max: yMax, step } = niceMax(Math.max(...totals, 0));
  return (
    <Frame height={height} legend={<Legend series={series} />}>
      {(width, setTip) => {
        const m = axisMargin;
        const plotH = height - m.top - m.bottom;
        const plotW = width - m.left - m.right;
        const band = plotW / data.length;
        const bw = Math.min(barMax, band * 0.6);
        const xOf = (i) => m.left + band * (i + 0.5);
        const hOf = (v) => (v / yMax) * plotH;
        return (
          <g>
            <Axes width={width} height={height} yMax={yMax} step={step} m={m} format={axisFormat} />
            {data.map((d, i) => {
              let cursor = m.top + plotH;
              const segs = [];
              const nonZero = d.values.map((v, s) => ({ v: v || 0, s })).filter((x) => x.v > 0);
              nonZero.forEach((x, k) => {
                const h = hOf(x.v);
                const isTop = k === nonZero.length - 1;
                const gap = isTop ? 0 : GAP;
                const y = cursor - h;
                segs.push(
                  isTop
                    ? <path key={x.s} d={topRounded(xOf(i) - bw / 2, y, bw, h, 4)} fill={series[x.s].color} />
                    : <rect key={x.s} x={xOf(i) - bw / 2} y={y + gap} width={bw} height={Math.max(h - gap, 0)} fill={series[x.s].color} />,
                );
                cursor = y;
              });
              return (
                <g key={i}>
                  {segs}
                  {showTotals && totals[i] > 0 && <text className="value-label" x={xOf(i)} y={cursor - 7} textAnchor="middle">{format(totals[i])}</text>}
                  <rect className="hit" x={xOf(i) - band / 2} y={m.top} width={band} height={plotH}
                    onMouseEnter={() => setTip({ x: xOf(i), y: cursor, title: `${d.label}${d.sub ? ` · ${d.sub}` : ''}`, rows: [...series.map((s, k) => ({ name: s.name, color: s.color, value: format(d.values[k] || 0) })), { name: 'Total', value: format(totals[i]) }] })}
                    onMouseLeave={() => setTip(null)} />
                </g>
              );
            })}
            <XLabels data={data} xOf={xOf} height={height} m={m} />
          </g>
        );
      }}
    </Frame>
  );
}

// ---------- Simple columns with optional overlay line (same unit) ----------
export function Columns({ data, name = 'Value', color = '#2a78d6', format, height = 260, line, axisFormat, barMax = BAR_MAX }) {
  const all = [...data.map((d) => d.value), ...(line ? line.values : [])];
  const { max: yMax, step } = niceMax(Math.max(...all, 0));
  const series = line ? [{ name, color }, { name: line.name, color: line.color, line: true }] : null;
  return (
    <Frame height={height} legend={series && <Legend series={series} />}>
      {(width, setTip) => {
        const m = axisMargin;
        const plotH = height - m.top - m.bottom;
        const plotW = width - m.left - m.right;
        const band = plotW / data.length;
        const bw = Math.min(barMax, band * 0.6);
        const xOf = (i) => m.left + band * (i + 0.5);
        const yOf = (v) => m.top + plotH - (v / yMax) * plotH;
        return (
          <g>
            <Axes width={width} height={height} yMax={yMax} step={step} m={m} format={axisFormat} />
            {data.map((d, i) => (
              <g key={i}>
                <path d={topRounded(xOf(i) - bw / 2, yOf(d.value), bw, plotH - (yOf(d.value) - m.top), 4)} fill={color} />
                <text className="value-label" x={xOf(i)} y={yOf(d.value) - 7} textAnchor="middle">{format(d.value)}</text>
              </g>
            ))}
            {line && (
              <g>
                <polyline fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={line.values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')} />
                {line.values.map((v, i) => <circle key={i} cx={xOf(i)} cy={yOf(v)} r="4.5" fill={line.color} stroke={SURFACE} strokeWidth="2" />)}
              </g>
            )}
            {data.map((d, i) => (
              <rect key={`h${i}`} className="hit" x={xOf(i) - band / 2} y={m.top} width={band} height={plotH}
                onMouseEnter={() => setTip({ x: xOf(i), y: yOf(Math.max(d.value, line ? line.values[i] : 0)), title: `${d.label}${d.sub ? ` · ${d.sub}` : ''}`, rows: [{ name, color, value: format(d.value) }, ...(line ? [{ name: line.name, color: line.color, value: format(line.values[i]) }] : [])] })}
                onMouseLeave={() => setTip(null)} />
            ))}
            <XLabels data={data} xOf={xOf} height={height} m={m} />
          </g>
        );
      }}
    </Frame>
  );
}

// ---------- Multi-series lines with crosshair ----------
export function Lines({ labels, series, format, height = 260, axisFormat, endLabels = true }) {
  const all = series.flatMap((s) => s.values);
  const { max: yMax, step } = niceMax(Math.max(...all, 0));
  return (
    <Frame height={height} legend={<Legend series={series} line />}>
      {(width, setTip) => {
        const m = { ...axisMargin, right: endLabels && series.length <= 3 ? 70 : 16 };
        const plotH = height - m.top - m.bottom;
        const plotW = width - m.left - m.right;
        const band = plotW / labels.length;
        const xOf = (i) => m.left + band * (i + 0.5);
        const yOf = (v) => m.top + plotH - (v / yMax) * plotH;
        return (
          <g>
            <Axes width={width} height={height} yMax={yMax} step={step} m={m} format={axisFormat} />
            {series.map((s) => (
              <g key={s.name}>
                <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${xOf(i)},${yOf(v)}`).join(' ')} />
                {s.values.map((v, i) => <circle key={i} cx={xOf(i)} cy={yOf(v)} r="4" fill={s.color} stroke={SURFACE} strokeWidth="2" />)}
                {endLabels && series.length <= 3 && <text className="value-label" x={xOf(labels.length - 1) + 9} y={yOf(s.values[s.values.length - 1]) + 4}>{format(s.values[s.values.length - 1])}</text>}
              </g>
            ))}
            {labels.map((l, i) => (
              <rect key={`h${i}`} className="hit" x={xOf(i) - band / 2} y={m.top} width={band} height={plotH}
                onMouseEnter={() => setTip({ x: xOf(i), y: yOf(Math.max(...series.map((s) => s.values[i]))), title: typeof l === 'string' ? l : `${l.label} · ${l.sub}`, rows: series.map((s) => ({ name: s.name, color: s.color, value: format(s.values[i]) })) })}
                onMouseLeave={() => setTip(null)} />
            ))}
            <XLabels data={labels.map((l) => (typeof l === 'string' ? { label: l } : l))} xOf={xOf} height={height} m={m} />
          </g>
        );
      }}
    </Frame>
  );
}

// ---------- Donut with legend table ----------
export function Donut({ slices, format, centerValue, centerLabel, size = 190, showTable = true }) {
  const [tip, setTip] = useState(null);
  const total = slices.reduce((t, s) => t + (s.value || 0), 0) || 1;
  const r = size / 2 - 4;
  const inner = r * 0.62;
  const cx = size / 2;
  const cy = size / 2;
  let angle = -Math.PI / 2;
  const arcs = slices.filter((s) => s.value > 0).map((s) => {
    const a0 = angle;
    const a1 = angle + (s.value / total) * Math.PI * 2;
    angle = a1;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, a) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
    const [x0, y0] = p(r, a0); const [x1, y1] = p(r, a1); const [x2, y2] = p(inner, a1); const [x3, y3] = p(inner, a0);
    const d = `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${inner},${inner} 0 ${large} 0 ${x3},${y3} Z`;
    const mid = (a0 + a1) / 2;
    return { ...s, d, mid, pct: (s.value / total) * 100 };
  });
  return (
    <div className="donut-wrap">
      <div className="chart" style={{ width: size }}>
        <svg width={size} height={size} role="img">
          {arcs.map((a) => (
            <path key={a.name} d={a.d} fill={a.color} stroke={SURFACE} strokeWidth="2"
              onMouseEnter={() => setTip({ x: cx + (r + 4) * Math.cos(a.mid) * 0.8, y: cy + (r + 4) * Math.sin(a.mid) * 0.8, rows: [{ name: a.name, color: a.color, value: `${format(a.value)} · ${a.pct.toFixed(1)}%` }] })}
              onMouseLeave={() => setTip(null)} />
          ))}
          <text x={cx} y={cy - 2} textAnchor="middle" style={{ fill: '#0b1f3a', fontSize: 19, fontWeight: 700 }}>{centerValue}</text>
          {centerLabel && <text x={cx} y={cy + 16} textAnchor="middle" style={{ fill: '#7b8a9b', fontSize: 11 }}>{centerLabel}</text>}
        </svg>
        <Tip tip={tip} />
      </div>
      {showTable && (
        <table className="donut-legend">
          <tbody>
            {slices.map((s) => (
              <tr key={s.name}>
                <td><i className="swatch round" style={{ background: s.color }} />{s.name}</td>
                <td className="num">{format(s.value)}</td>
                <td className="num muted">{((s.value / total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------- 100% stacked columns with in-segment labels ----------
export function Stacked100({ data, series, height = 280 }) {
  return (
    <Frame height={height} legend={<Legend series={series} />}>
      {(width, setTip) => {
        const m = { top: 12, right: 12, bottom: 38, left: 40 };
        const plotH = height - m.top - m.bottom;
        const plotW = width - m.left - m.right;
        const band = plotW / data.length;
        const bw = Math.min(44, band * 0.62);
        const xOf = (i) => m.left + band * (i + 0.5);
        return (
          <g>
            {[0, 25, 50, 75, 100].map((t) => (
              <g key={t}>
                <line className="grid-line" x1={m.left} x2={width - m.right} y1={m.top + plotH - (t / 100) * plotH} y2={m.top + plotH - (t / 100) * plotH} />
                <text className="axis-text" x={m.left - 8} y={m.top + plotH - (t / 100) * plotH + 3.5} textAnchor="end">{t}%</text>
              </g>
            ))}
            {data.map((d, i) => {
              const total = d.values.reduce((t, v) => t + (v || 0), 0) || 1;
              let cursor = m.top + plotH;
              return (
                <g key={i}>
                  {d.values.map((v, s) => {
                    const h = ((v || 0) / total) * plotH;
                    const y = cursor - h;
                    cursor = y;
                    if (h <= 0) return null;
                    const isTop = s === d.values.length - 1 || d.values.slice(s + 1).every((x) => !x);
                    return (
                      <g key={s}>
                        {isTop ? <path d={topRounded(xOf(i) - bw / 2, y, bw, h, 4)} fill={series[s].color} /> : <rect x={xOf(i) - bw / 2} y={y + GAP} width={bw} height={Math.max(h - GAP, 0)} fill={series[s].color} />}
                        {h >= 15 && <text className="in-label" x={xOf(i)} y={y + h / 2 + 4} textAnchor="middle" fill={series[s].ink || '#fff'}>{Math.round((v / total) * 100)}%</text>}
                      </g>
                    );
                  })}
                  <rect className="hit" x={xOf(i) - band / 2} y={m.top} width={band} height={plotH}
                    onMouseEnter={() => setTip({ x: xOf(i), y: m.top, title: `${d.label}${d.sub ? ` · ${d.sub}` : ''}`, rows: series.map((s, k) => ({ name: s.name, color: s.color, value: `${Math.round(((d.values[k] || 0) / total) * 100)}%` })) })}
                    onMouseLeave={() => setTip(null)} />
                </g>
              );
            })}
            <XLabels data={data} xOf={xOf} height={height} m={m} />
          </g>
        );
      }}
    </Frame>
  );
}

// ---------- Pyramid (bottom = first row) ----------
export function Pyramid({ rows, format, width = 220, height = 200 }) {
  const total = rows.reduce((t, r) => t + (r.value || 0), 0) || 1;
  const maxVal = Math.max(...rows.map((r) => r.value || 0), 1);
  const rowH = (height - 24) / rows.length;
  let y = height;
  return (
    <div className="pyramid-wrap">
      <svg width={width} height={height} role="img">
        {rows.map((r, i) => {
          const wBottom = Math.max(28, (r.value / maxVal) * (width - 8));
          const next = rows[i + 1];
          const wTop = next ? Math.max(28, (next.value / maxVal) * (width - 8)) : wBottom * 0.55;
          const y1 = y; const y0 = y - rowH + GAP;
          y -= rowH;
          const cx = width / 2;
          const d = `M${cx - wBottom / 2},${y1} L${cx + wBottom / 2},${y1} L${cx + wTop / 2},${y0} L${cx - wTop / 2},${y0} Z`;
          const label = format ? format(r.value) : Math.round(r.value);
          const fits = Math.min(wBottom, wTop) > 40;
          return (
            <g key={r.name}>
              <path d={d} fill={r.color} />
              {fits && <text className="in-label" x={cx} y={(y0 + y1) / 2 + 4} textAnchor="middle" fill={r.ink || '#fff'}>{label}</text>}
            </g>
          );
        })}
      </svg>
      <table className="donut-legend">
        <thead><tr><th>Experience band</th><th className="num">Headcount</th><th className="num">Share</th></tr></thead>
        <tbody>
          {[...rows].reverse().map((r) => (
            <tr key={r.name}><td><i className="swatch round" style={{ background: r.color }} />{r.name}</td><td className="num">{format ? format(r.value) : Math.round(r.value)}</td><td className="num muted">{((r.value / total) * 100).toFixed(0)}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Tornado ----------
export function Tornado({ rows, format, height }) {
  const h = height || rows.length * 40 + 40;
  const maxAbs = Math.max(...rows.flatMap((r) => [Math.abs(r.down), Math.abs(r.up)]), 1);
  return (
    <Frame height={h}>
      {(width, setTip) => {
        const m = { top: 20, right: 90, bottom: 16, left: 170 };
        const plotW = width - m.left - m.right;
        const cx = m.left + plotW / 2;
        const scale = (plotW / 2) / maxAbs;
        const rowH = (h - m.top - m.bottom) / rows.length;
        return (
          <g>
            <line className="baseline" x1={cx} x2={cx} y1={m.top - 6} y2={h - m.bottom} />
            {rows.map((r, i) => {
              const y = m.top + rowH * i + rowH / 2;
              const bh = Math.min(22, rowH * 0.6);
              const wUp = Math.abs(r.up) * scale; const wDown = Math.abs(r.down) * scale;
              const upRight = r.up >= 0;
              const downRight = r.down >= 0;
              return (
                <g key={r.name}>
                  <text className="axis-text" x={m.left - 12} y={y + 4} textAnchor="end" style={{ fill: '#14243a', fontWeight: 600, fontSize: 12.5 }}>{r.name}</text>
                  <text className="axis-text sub" x={m.left - 12} y={y + 17} textAnchor="end">±{r.flex}%</text>
                  <rect x={upRight ? cx + 1 : cx - wUp - 1} y={y - bh / 2} width={wUp} height={bh} rx="3" fill="#2a78d6" />
                  <rect x={downRight ? cx + 1 : cx - wDown - 1} y={y - bh / 2} width={wDown} height={bh} rx="3" fill="#86b6ef" />
                  {(() => {
                    const upIn = wUp > 84; const downIn = wDown > 84;
                    const upX = upIn ? (upRight ? cx + wUp - 8 : cx - wUp + 8) : (upRight ? cx + wUp + 8 : cx - wUp - 8);
                    const downX = downIn ? (downRight ? cx + wDown - 8 : cx - wDown + 8) : (downRight ? cx + wDown + 8 : cx - wDown - 8);
                    return (
                      <>
                        <text className="value-label" x={upX} y={y + 4} textAnchor={(upRight ? !upIn : upIn) ? 'start' : 'end'} style={upIn ? { fill: '#fff' } : undefined}>{format(r.up)}</text>
                        <text className="value-label" x={downX} y={y + 4} textAnchor={(downRight ? !downIn : downIn) ? 'start' : 'end'} style={{ fill: downIn ? '#0b1f3a' : '#44546a', fontWeight: 600 }}>{format(r.down)}</text>
                      </>
                    );
                  })()}
                  <rect className="hit" x={m.left} y={y - rowH / 2} width={plotW} height={rowH}
                    onMouseEnter={() => setTip({ x: cx, y: y - bh / 2, title: r.name, rows: [{ name: `+${r.flex}%`, color: '#2a78d6', value: format(r.up) }, { name: `−${r.flex}%`, color: '#86b6ef', value: format(r.down) }] })}
                    onMouseLeave={() => setTip(null)} />
                </g>
              );
            })}
          </g>
        );
      }}
    </Frame>
  );
}
