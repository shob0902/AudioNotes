/** Shimmer placeholder — used instead of full-page spinners for async loads. */
export default function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
