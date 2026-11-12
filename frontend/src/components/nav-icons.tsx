const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "size-5 shrink-0",
};

export const NavIcon = {
  home: () => (
    <svg {...base}>
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />
    </svg>
  ),
  paw: () => (
    <svg {...base}>
      <circle cx="6" cy="9" r="2" />
      <circle cx="10" cy="5" r="2" />
      <circle cx="14" cy="5" r="2" />
      <circle cx="18" cy="9" r="2" />
      <path d="M8 16c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5c0 2-1.5 3-4 3s-4-1-4-3z" />
    </svg>
  ),
  syringe: () => (
    <svg {...base}>
      <path d="M18 2l4 4M16 4l4 4M19 5l-9.5 9.5M7 12l5 5M4.5 14.5l5 5M10 16l-6 6" />
      <path d="M14 7l3 3" />
    </svg>
  ),
  pill: () => (
    <svg {...base}>
      <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" />
      <path d="M9.2 9.2l5.6 5.6" />
    </svg>
  ),
  bath: () => (
    <svg {...base}>
      <path d="M3 12h18v2a5 5 0 01-5 5H8a5 5 0 01-5-5v-2zM6 12V5a2 2 0 014 0M7 19l-1 2M17 19l1 2" />
    </svg>
  ),
  stethoscope: () => (
    <svg {...base}>
      <path d="M5 3v5a4 4 0 008 0V3M9 12v3a5 5 0 0010 0v-2" />
      <circle cx="19" cy="11" r="2" />
    </svg>
  ),
  symptom: () => (
    <svg {...base}>
      <path d="M3 12h4l2-5 4 10 2-5h6" />
    </svg>
  ),
  users: () => (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0M16 4.5a3.5 3.5 0 010 7M18 14a5.5 5.5 0 013.5 6" />
    </svg>
  ),
  user: () => (
    <svg {...base}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </svg>
  ),
  more: () => (
    <svg {...base}>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </svg>
  ),
  logout: () => (
    <svg {...base}>
      <path d="M15 4h4a1 1 0 011 1v14a1 1 0 01-1 1h-4M10 17l-5-5 5-5M5 12h11" />
    </svg>
  ),
};
