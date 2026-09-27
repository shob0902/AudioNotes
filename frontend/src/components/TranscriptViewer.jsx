// The scrollable transcript panel, shown as one continuous block since there are no timestamps.
import CopyButton from "./CopyButton.jsx";
import SectionBlock from "./SectionBlock.jsx";
import styles from "./TranscriptViewer.module.css";
// Renders the transcript in a scrolling box with a button to copy the whole thing.
export default function TranscriptViewer({ transcript }) {
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  return (
    <SectionBlock
      title="Transcript"
      eyebrow={`${words.toLocaleString()} words // Gnani ASR`}
      actions={<CopyButton text={transcript} label="Copy" toastMessage="Transcript copied to clipboard" />}
    >
      <div className={styles.scroll} tabIndex={0} aria-label="Transcript text">
        <p className={styles.text}>{transcript}</p>
      </div>
    </SectionBlock>
  );
}
