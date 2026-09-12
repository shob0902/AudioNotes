// The scrollable transcript panel, shown as one continuous block since there are no timestamps.
import Card from "./ui/Card.jsx";
import CopyButton from "./CopyButton.jsx";
// Renders the transcript in a scrolling box with a button to copy the whole thing.
export default function TranscriptViewer({ transcript }) {
  return (
    <Card variant="elevated" className="p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-bold text-ink">Transcript</h2>
        <CopyButton text={transcript} label="Copy" toastMessage="Transcript copied to clipboard" />
      </div>
      <div className="scrollbar-thin mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-glass-border bg-elevated p-4 shadow-inset">
        <p className="whitespace-pre-wrap text-[15px] leading-[1.8] text-ink">{transcript}</p>
      </div>
    </Card>
  );
}
