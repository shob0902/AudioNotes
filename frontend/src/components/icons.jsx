/**
 * Small inline icon set (stroke-based, 24x24 viewBox) shared across the
 * sidebar, cards, and empty states — kept in one file instead of an icon
 * library dependency, matching the app's existing hand-rolled SVG approach.
 */
const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const DashboardIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
    <rect x="13" y="3.5" width="7.5" height="4.5" rx="2" />
    <rect x="13" y="10.5" width="7.5" height="10" rx="2" />
    <rect x="3.5" y="13.5" width="7.5" height="7" rx="2" />
  </svg>
);

export const MicIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M9 21h6" />
  </svg>
);

export const SparkleIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.8L12 18l-1.7-5.5L5 10.7l5.3-1.7L12 3.5Z" />
    <path d="M19 15.5 19.7 18 22 18.7 19.7 19.4 19 22 18.3 19.4 16 18.7l2.3-.7z" />
  </svg>
);

export const UploadCloudIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M7.5 18.5A4.5 4.5 0 0 1 6 9.6 5.5 5.5 0 0 1 16.9 8a4 4 0 0 1 1.1 7.9" />
    <path d="M12 21v-8m0 0-3 3m3-3 3 3" />
  </svg>
);

export const StarIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m12 3.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7L12 3.5Z" />
  </svg>
);

export const SettingsIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1Z" />
  </svg>
);

export const SearchIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.8-3.8" />
  </svg>
);

export const MenuIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const PlayIcon = (props) => (
  <svg {...base} {...props} fill="currentColor" stroke="none">
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

export const PauseIcon = (props) => (
  <svg {...base} {...props} fill="currentColor" stroke="none">
    <rect x="7" y="5" width="4" height="14" rx="1" />
    <rect x="13" y="5" width="4" height="14" rx="1" />
  </svg>
);

export const SkipBackIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M9.5 12 18 6v12l-8.5-6Z" fill="currentColor" stroke="none" />
    <path d="M6 6v12" />
  </svg>
);

export const SkipForwardIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M14.5 12 6 6v12l8.5-6Z" fill="currentColor" stroke="none" />
    <path d="M18 6v12" />
  </svg>
);

export const VolumeIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" />
    <path d="M16.5 9a3.5 3.5 0 0 1 0 6" />
  </svg>
);

export const TrashIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.8 12a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
