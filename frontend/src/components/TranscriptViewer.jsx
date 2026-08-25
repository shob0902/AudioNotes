import Card from "./ui/Card.jsx";
import CopyButton from "./CopyButton.jsx";

/**
 * Gnani's STT response returns plain transcript text with no per-word/
 * per-sentence timestamps (see /architecture — the response is just
 * { success, request_id, timestamp, transcript }, where `timestamp` is the
 * server's request time, not an audio position). So unlike a
 * timestamp-per-paragraph mockup, this deliberately shows one continuous,
 * readable transcript rather than fabricating sync points that don't exist.
 */
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
