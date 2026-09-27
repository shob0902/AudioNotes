// The settings page showing the signed-in account, a log-out button and some app information.
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import { ArrowIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { GITHUB_REPO_URL } from "../utils/links.js";
import styles from "./Settings.module.css";
// Renders the account panel and the about panel, and sends the user home after logging out.
export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="page">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Settings {"//"} Account</p>
        <h1 className={styles.title}>Settings.</h1>
      </header>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Account</h2>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Signed in as</dt>
              <dd className={styles.factValue}>{user?.email}</dd>
            </div>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Stored in this browser</dt>
              <dd className={styles.factValue}>Favorites and checked-off action items</dd>
            </div>
          </dl>
          <Button
            variant="primary"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Log out
          </Button>
        </section>
        <section className={`${styles.panel} ${styles.invert} onDark`}>
          <h2 className={styles.panelTitle}>About</h2>
          <p className={styles.text}>
            Audio Notes uploads your audio, transcribes it with Gnani Speech-to-Text, and turns the transcript into a
            structured summary with Groq.
          </p>
          <dl className={styles.facts}>
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Source code</dt>
              <dd className={styles.factValue}>
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={styles.link}>
                  {GITHUB_REPO_URL}
                </a>
              </dd>
            </div>
          </dl>
          <Link to="/architecture" className={styles.cta}>
            How it works
            <ArrowIcon className={styles.ctaArrow} />
          </Link>
        </section>
      </div>
    </div>
  );
}
