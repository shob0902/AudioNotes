// The public landing page: typographic masthead, marquee band, numbered how-it-works list and a sample output slab.
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import GoogleCallback from "../components/GoogleCallback.jsx";
import Marquee from "../components/Marquee.jsx";
import ScrollDial from "../components/ScrollDial.jsx";
import { ArrowIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { readGoogleCallback } from "../utils/googleAuth.js";
import { generateWaveformBars } from "../utils/waveform.js";
import styles from "./Landing.module.css";
const STEPS = [
  {
    title: "Upload",
    description: "Drop in a recording — a meeting, a lecture, a voice memo. MP3, WAV, M4A, and more.",
    tags: ["MP3", "WAV", "M4A", "Up to 200 MB"],
  },
  {
    title: "Transcribe",
    description: "Gnani's speech-to-text turns your audio into an accurate, readable transcript, chunk by chunk.",
    tags: ["Gnani ASR", "30s chunks"],
    accent: "Gnani ASR",
  },
  {
    title: "Summarize",
    description: "Groq's LLM extracts key points, action items, decisions and topics — instantly searchable.",
    tags: ["Groq LLM", "Key points", "Action items", "Decisions"],
    accent: "Groq LLM",
  },
];
const SAMPLE_BARS = generateWaveformBars("landing-sample", 64);
// Handles Google's sign-in redirect (which lands on "/"), sends anyone already logged in to their dashboard,
// and otherwise renders the pitch.
export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isGoogleCallback = Boolean(readGoogleCallback(location.search));
  const returnTo = location.state?.from || "/dashboard";
  useEffect(() => {
    if (!isGoogleCallback && !isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isGoogleCallback, isLoading, isAuthenticated, navigate]);
  if (isGoogleCallback) return <GoogleCallback />;
  if (isLoading || isAuthenticated) return null;
  return (
    <>
      <div className="page">
        <section className={styles.masthead}>
          <h1 className={styles.headline}>
            Audio
            <br />
            Notes.
          </h1>
          <div className={styles.metaRow}>
            <p className={styles.metaLeft}>
              <span>Record // Transcribe</span>
              <span className={styles.muted}>Summarize — in minutes</span>
            </p>
            <ScrollDial href="#how-it-works" />
            <p className={styles.metaRight}>
              <span>Speech in.</span>
              <span className={styles.muted}>Notes out.</span>
            </p>
          </div>
        </section>
        <section className={styles.lead}>
          <p className={styles.leadText}>
            Upload any recording and let AI do the rest — a full transcript plus a structured summary with key points,
            action items and decisions, ready in minutes.
          </p>
          <div className={styles.leadActions}>
            <GoogleButton from={returnTo} />
          </div>
        </section>
      </div>
      <Marquee
        label="What Audio Notes does"
        top={["Upload", "Transcribe", "Summarize"]}
        bottom={["Key points", "Action items", "Decisions", "Topics"]}
      />
      <div className="page">
        <h2 id="how-it-works" className={styles.sectionTitle}>
          How it works
        </h2>
      </div>
      <ol className={`${styles.index} onDark`}>
        {STEPS.map((step, i) => (
          <li key={step.title} className={styles.indexRow}>
            <span className={styles.indexNumber}>{String(i + 1).padStart(2, "0")}</span>
            <div className={styles.indexBody}>
              <h3 className={styles.indexTitle}>
                <Link to="/architecture" className={styles.indexLink}>
                  {step.title}
                </Link>
              </h3>
              <p className={styles.indexText}>{step.description}</p>
              <ul className={styles.tags}>
                {step.tags.map((tag) => (
                  <li key={tag} className={`${styles.tag} ${tag === step.accent ? styles.tagAccent : ""}`}>
                    {tag}
                  </li>
                ))}
              </ul>
            </div>
            <ArrowIcon className={styles.indexArrow} />
          </li>
        ))}
      </ol>
      <div className="page">
        <h2 className={styles.sectionTitle}>What you get</h2>
        <article className={`${styles.spotlight} onDark`}>
          <div className={styles.spotlightWave} aria-hidden="true">
            {SAMPLE_BARS.map((h, i) => (
              <span key={i} style={{ height: `${h * 100}%` }} />
            ))}
          </div>
          <div className={styles.spotlightContent}>
            <span className={styles.eyebrow}>Sample // Output</span>
            <h3 className={styles.spotlightTitle}>Weekly sync: Q3 roadmap</h3>
            <ul className={styles.chips}>
              <li className={styles.chip}>42 min</li>
              <li className={`${styles.chip} ${styles.chipHighlight}`}>6 action items</li>
              <li className={styles.chip}>3 decisions</li>
              <li className={styles.chip}>Completed</li>
            </ul>
            <p className={styles.spotlightText}>
              The team agreed to ship the mobile beta before the pricing change, moved the analytics rebuild to Q4,
              and assigned owners for the onboarding revamp. Open questions remain on the enterprise SSO timeline.
            </p>
            <Button to="/login" variant="accent">
              Try it on your audio
              <ArrowIcon className="arrow" />
            </Button>
          </div>
        </article>
      </div>
    </>
  );
}
