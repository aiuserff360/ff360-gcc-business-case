// Minimal inline stroke icon set (24px grid).
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

const PATHS = {
  home: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v10h13V10" /><path d="M10 20v-6h4v6" /></>,
  people: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><circle cx="17" cy="9" r="2.4" /><path d="M16 14.2c2.6.2 4.5 2 4.5 4.8" /></>,
  coins: <><ellipse cx="12" cy="6.5" rx="7" ry="3" /><path d="M5 6.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /><path d="M5 11.5v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></>,
  building: <><rect x="4" y="3.5" width="12" height="17" rx="1" /><path d="M16 9h4v11.5h-4" /><path d="M7.5 7.5h2M11 7.5h2M7.5 11h2M11 11h2M7.5 14.5h2M11 14.5h2M9.5 20.5v-3h2v3" /></>,
  monitor: <><rect x="3" y="4.5" width="18" height="12" rx="1.5" /><path d="M9 20h6M12 16.5V20" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></>,
  chart: <><path d="M4 20h16" /><rect x="6" y="11" width="3" height="7" rx=".5" /><rect x="11" y="6" width="3" height="12" rx=".5" /><rect x="16" y="9" width="3" height="9" rx=".5" /></>,
  sliders: <><path d="M4 7h16M4 12h16M4 17h16" /><circle cx="9" cy="7" r="1.8" fill="#fff" /><circle cx="15" cy="12" r="1.8" fill="#fff" /><circle cx="8" cy="17" r="1.8" fill="#fff" /></>,
  calc: <><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M8 7h8M8.5 11.5h1M12 11.5h1M15.5 11.5h1M8.5 15h1M12 15h1M15.5 15v3M8.5 18h1M12 18h1" /></>,
  parking: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9.5 16.5V8h3.5a2.5 2.5 0 0 1 0 5H9.5" /></>,
  seat: <><path d="M7 10V6.5A2.5 2.5 0 0 1 9.5 4h5A2.5 2.5 0 0 1 17 6.5V10" /><path d="M5 12.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V15H5z" /><path d="M6.5 15v3M17.5 15v3M9 15h6" /></>,
  save: <><path d="M5 4h11l3 3v13H5z" /><path d="M8 4v5h7V4" /><rect x="8" y="14" width="8" height="6" /></>,
  compare: <><rect x="3" y="5" width="8" height="14" rx="1" /><rect x="13" y="5" width="8" height="14" rx="1" /><path d="M7 9v6M17 9v6" /></>,
  export: <><path d="M12 15V4" /><path d="m8 8 4-4 4 4" /><path d="M4 14v5h16v-5" /></>,
  import: <><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M4 14v5h16v-5" /></>,
  more: <><circle cx="6" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18" cy="12" r="1.4" fill="currentColor" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  arrowRight: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: <><path d="M12 3.5 2.5 20h19z" /><path d="M12 10v4M12 17.2v.3" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8v.3" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" /></>,
  doc: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 12h6M9 16h6" /></>,
  print: <><path d="M7 8V3h10v5" /><rect x="4" y="8" width="16" height="8" rx="1.5" /><path d="M7 13h10v8H7z" /></>,
  logout: <><path d="M14 4h5v16h-5" /><path d="M4 12h10" /><path d="m10 8 4 4-4 4" /></>,
  trend: <><path d="M4 18 10 11l4 4 6-8" /><path d="M15 7h5v5" /></>,
  laptop: <><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2.5 19h19" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>,
  pin: <><path d="M12 21s6-6.2 6-11a6 6 0 0 0-12 0c0 4.8 6 11 6 11z" /><circle cx="12" cy="10" r="2.2" /></>,
  layers: <><path d="m12 4 9 4.5-9 4.5-9-4.5z" /><path d="m3 13 9 4.5 9-4.5" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9.5h.3M17.7 14.5h.3" /></>,
  scale: <><path d="M12 4v16M5 20h14" /><path d="M4 8h16" /><path d="m7 8-3 6a3 3 0 0 0 6 0zM17 8l-3 6a3 3 0 0 0 6 0z" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="1.5" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  edit: <><path d="M4 20h4l11-11-4-4L4 16z" /><path d="m13 7 4 4" /></>,
  reset: <><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v5h5" /></>,
};

export function Icon({ name, size, className, style }) {
  const p = PATHS[name] || PATHS.info;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} aria-hidden="true" {...base}>
      {p}
    </svg>
  );
}
