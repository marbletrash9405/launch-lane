// Small inline icons so the site has no icon-library dependency.
const base = {
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
  "aria-hidden": true,
};

export const SearchIcon = () => (
  <svg {...base}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const PeopleIcon = () => (
  <svg {...base}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M15 14.5c2.8 0 6 1.7 6 5.5" /></svg>
);
export const ShieldXIcon = () => (
  <svg {...base}><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" /><path d="m9.5 9.5 5 5m0-5-5 5" /></svg>
);
export const ShieldCheckIcon = () => (
  <svg {...base}><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const GuardianIcon = () => (
  <svg {...base}><circle cx="8" cy="7" r="3" /><circle cx="16.5" cy="10" r="2.5" /><path d="M2.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6" /><path d="M13 20c0-2.5 1.6-4.5 3.5-4.5S20 17.5 20 20" /></svg>
);
export const MailIcon = () => (
  <svg {...base}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
export const ChatIcon = () => (
  <svg {...base}><path d="M4 5h16v10H9l-5 4V5Z" /><path d="M8.5 10h.01M12 10h.01M15.5 10h.01" /></svg>
);
export const MenuIcon = () => (
  <svg {...base} width={28} height={28}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = () => (
  <svg {...base} width={28} height={28}><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export function IconRing({ children }) {
  return (
    <div className="icon-ring"><span>{children}</span></div>
  );
}

// Category icons
export const BinIcon = () => (
  <svg {...base}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></svg>
);
export const LeafIcon = () => (
  <svg {...base}><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" /><path d="M5 19 13 11" /></svg>
);
export const HeartIcon = () => (
  <svg {...base}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>
);
export const PawIcon = () => (
  <svg {...base}><circle cx="7" cy="9" r="1.6" /><circle cx="11" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="18" cy="10" r="1.6" /><path d="M8 17c0-2.8 2-5 4-5s4 2.2 4 5c0 1.7-1.5 2.5-4 2.5S8 18.7 8 17Z" /></svg>
);
export const BoxIcon = () => (
  <svg {...base}><path d="M3 8l9-4 9 4-9 4-9-4Z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" /></svg>
);
export const BrushIcon = () => (
  <svg {...base}><path d="M14 4l6 6-8 8-4-1-1-4 7-9Z" /><path d="M7 17c-1 2-2 3-4 3 0-2 1-3 3-4" /></svg>
);
export const BookIcon = () => (
  <svg {...base}><path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1V5Z" /><path d="M12 6v14" /></svg>
);
export const SparkIcon = () => (
  <svg {...base}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>
);
export const ArrowIcon = () => (
  <svg {...base} width={18} height={18}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const MonitorIcon = () => (
  <svg {...base}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
);
