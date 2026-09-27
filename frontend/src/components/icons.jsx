// The hand-rolled inline SVG icon set used across the app, so no icon library is needed.
const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
  "aria-hidden": "true",
};
const arrowBase = { ...base, strokeWidth: 2.5 };
// Four panels, used for the Dashboard nav item.
export const DashboardIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" />
    <rect x="13" y="3.5" width="7.5" height="4.5" />
    <rect x="13" y="10.5" width="7.5" height="10" />
    <rect x="3.5" y="13.5" width="7.5" height="7" />
  </svg>
);
// A microphone, used for recordings.
export const MicIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21M9 21h6" />
  </svg>
);
// A sparkle, used wherever AI-generated output is shown.
export const SparkleIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.8L12 18l-1.7-5.5L5 10.7l5.3-1.7L12 3.5Z" />
    <path d="M19 15.5 19.7 18 22 18.7 19.7 19.4 19 22 18.3 19.4 16 18.7l2.3-.7z" />
  </svg>
);
// A cloud with an up arrow, used for the upload actions.
export const UploadCloudIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M7.5 18.5A4.5 4.5 0 0 1 6 9.6 5.5 5.5 0 0 1 16.9 8a4 4 0 0 1 1.1 7.9" />
    <path d="M12 21v-8m0 0-3 3m3-3 3 3" />
  </svg>
);
// A star, used for the favorites toggle.
export const StarIcon = (props) => (
  <svg {...base} {...props}>
    <path d="m12 3.5 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7L12 3.5Z" />
  </svg>
);
// A cog, used for the Settings nav item.
export const SettingsIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1Z" />
  </svg>
);
// A magnifier, used in the search field.
export const SearchIcon = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.8-3.8" />
  </svg>
);
// An open book, used for the architecture docs nav item.
export const BookIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M3.5 5h6a2.5 2.5 0 0 1 2.5 2.5V20a2 2 0 0 0-2-2H3.5V5Z" />
    <path d="M20.5 5h-6A2.5 2.5 0 0 0 12 7.5V20a2 2 0 0 1 2-2h6.5V5Z" />
  </svg>
);
// A house, used for the Home nav item when logged out.
export const HomeIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4v-9.5Z" />
  </svg>
);
// An X, used to dismiss toasts.
export const CloseIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
// A filled triangle, used to start playback.
export const PlayIcon = (props) => (
  <svg {...base} {...props} fill="currentColor" stroke="none">
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);
// Two filled bars, used to pause playback.
export const PauseIcon = (props) => (
  <svg {...base} {...props} fill="currentColor" stroke="none">
    <rect x="7" y="5" width="4" height="14" />
    <rect x="13" y="5" width="4" height="14" />
  </svg>
);
// A back arrow with a bar, used to skip backwards.
export const SkipBackIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M9.5 12 18 6v12l-8.5-6Z" fill="currentColor" stroke="none" />
    <path d="M6 6v12" />
  </svg>
);
// A forward arrow with a bar, used to skip ahead.
export const SkipForwardIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M14.5 12 6 6v12l8.5-6Z" fill="currentColor" stroke="none" />
    <path d="M18 6v12" />
  </svg>
);
// A speaker, used for the volume control.
export const VolumeIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4Z" />
    <path d="M16.5 9a3.5 3.5 0 0 1 0 6" />
  </svg>
);
// A bin, used for the delete action.
export const TrashIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M5 7h14M9 7V4h6v3m3 0-1 13.5H7L6 7" />
    <path d="M10 11v6M14 11v6" />
  </svg>
);
// A copy glyph, used by the copy-to-clipboard button.
export const CopyIcon = (props) => (
  <svg {...base} {...props}>
    <rect x="8.5" y="8.5" width="11" height="11" />
    <path d="M15.5 8.5v-4h-11v11h4" />
  </svg>
);
// A warning triangle, used by inline error notices.
export const AlertIcon = (props) => (
  <svg {...base} {...props}>
    <path d="M12 3.5 21.5 20h-19L12 3.5Z" />
    <path d="M12 10v4.5M12 17v.5" />
  </svg>
);
// A diagonal up-right arrow, used in CTAs; it rotates 45° on hover.
export const ArrowIcon = (props) => (
  <svg {...arrowBase} {...props}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);
// A left arrow, used by back buttons.
export const BackIcon = (props) => (
  <svg {...arrowBase} {...props}>
    <path d="M20 12H5m6-6-6 6 6 6" />
  </svg>
);
// A downward arrow, used in the scroll dial.
export const DownArrowIcon = (props) => (
  <svg {...arrowBase} {...props}>
    <path d="M12 4v15m-6-6 6 6 6-6" />
  </svg>
);
