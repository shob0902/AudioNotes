// The shimmering placeholder block shown while content loads.
// Renders a single shimmer bar sized by whatever classes the caller passes.
export default function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
