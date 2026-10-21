type Name = 'check' | 'plus' | 'tasks' | 'sun' | 'calendar' | 'done' | 'star' | 'search' | 'sync' | 'chevron' | 'close' | 'trash' | 'download' | 'upload' | 'help' | 'arrow' | 'laptop' | 'phone' | 'copy' | 'menu' | 'leaf' | 'settings';
const paths: Record<Name, React.ReactNode> = {
  check: <path d="m5 12 4 4L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  tasks: <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6m-6 4h6m-6 4h4" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-14 4h3" /></>,
  done: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  sync: <><path d="M20 8a8 8 0 0 0-13.5-3L3 8m0-5v5h5m-4 8a8 8 0 0 0 13.5 3L21 16m-5 0h5v5" /></>,
  chevron: <path d="m8 5 7 7-7 7" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trash: <><path d="M3 6h18m-13 0V3h8v3M6 6l1 15h10l1-15M10 10v6m4-6v6" /></>,
  download: <><path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6" /></>,
  upload: <><path d="M12 15V3m-4 4 4-4 4 4M4 15v6h16v-6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 2M12 16h.01" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  laptop: <><rect x="5" y="3" width="14" height="12" rx="2" /><path d="m5 15-3 5h20l-3-5" /></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 5h4m-3 14h2" /></>,
  copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  leaf: <><path d="M19 3C8 1 2 8 6 15s16 2 13-12ZM5 21 15 9" /></>,
  settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" /><circle cx="15" cy="17" r="3" /></>,
};
export function Icon({ name, size = 20 }: { name: Name; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export type IconName = Name;

export function Brand() {
  return <span className="brand"><img src="./favicon.svg" width="35" height="35" alt="" /><span>tandem<span className="brand-period">.</span></span></span>;
}

export function EmptyArt() {
  return <svg className="empty-art" width="200" height="155" viewBox="0 0 200 155" fill="none" aria-hidden="true">
    <ellipse cx="100" cy="137" rx="68" ry="9" fill="#e9ede3" />
    <path d="M36 108c-14-28-5-54 15-69 24-18 69-25 99-2 24 19 20 52 3 73" fill="#eef2e8" />
    <g transform="rotate(-9 91 80)"><rect x="52" y="24" width="87" height="111" rx="9" fill="#e0e8d8" stroke="#b5c6aa" strokeWidth="1.5" /></g>
    <g transform="rotate(5 105 80)"><rect x="63" y="28" width="83" height="108" rx="8" fill="#fffefb" stroke="#90a68b" strokeWidth="1.5" /><rect x="84" y="22" width="40" height="13" rx="5" fill="#dbe6d3" stroke="#90a68b" strokeWidth="1.5" /><rect x="77" y="52" width="14" height="14" rx="4" fill="#285b48" /><path d="m81 59 3 3 4-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /><path d="M100 57h28m-28 6h19" stroke="#b0bba7" strokeWidth="2" strokeLinecap="round" /><rect x="77" y="79" width="14" height="14" rx="4" stroke="#b0bba7" strokeWidth="1.5" /><path d="M100 84h28m-28 6h16" stroke="#c9d1c1" strokeWidth="2" strokeLinecap="round" /><rect x="77" y="106" width="14" height="14" rx="4" stroke="#b0bba7" strokeWidth="1.5" /><path d="M100 112h23" stroke="#c9d1c1" strokeWidth="2" strokeLinecap="round" /></g>
    <path d="M155 124c-2-17 3-31 15-40 4 16-3 25-15 26m1 15c7-10 13-11 23-9-6 10-14 13-23 9" fill="#a6bd92" /><path d="m30 72 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="#c5d4b6" /><circle cx="161" cy="40" r="3" fill="#d4ba78" />
  </svg>;
}
