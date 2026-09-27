// The shimmering placeholder block shown while content loads.
// Renders a single shimmer block; size it with an inline style or a caller class.
export default function Skeleton({ className = "", style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}
