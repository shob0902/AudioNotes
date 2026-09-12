// The small inline "nothing here" line used inside a card section.
// Renders the given text as muted helper copy.
export function EmptyStateSmall({ text }) {
  return <p className="mt-3 text-sm text-muted">{text}</p>;
}
