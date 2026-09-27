// The giant CTA footer: a huge headline, a big pill button, then the copyright and links row.
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { GITHUB_REPO_URL } from "../../utils/links.js";
import { ArrowIcon } from "../icons.jsx";
import styles from "./Footer.module.css";
// Points the CTA at uploading when logged in and at signing up otherwise.
export default function Footer() {
  const { isAuthenticated } = useAuth();
  const cta = isAuthenticated
    ? { to: "/dashboard?action=upload", label: "Upload a recording" }
    : { to: "/signup", label: "Start taking notes" };
  return (
    <footer className={styles.footer}>
      <div className="page">
        <section className={styles.cta} aria-label="Call to action">
          <h2 className={styles.headline}>
            Note it
            <br />
            down.
          </h2>
          <Link to={cta.to} className={styles.button}>
            {cta.label}
            <ArrowIcon className={styles.arrow} />
          </Link>
        </section>
        <div className={styles.bottom}>
          <p className={styles.copy}>© {new Date().getFullYear()} AudioNotes // Gnani × Groq</p>
          <nav aria-label="Footer" className={styles.links}>
            <Link to="/architecture">Architecture</Link>
            <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            {isAuthenticated ? <Link to="/settings">Settings</Link> : <Link to="/login">Log in</Link>}
          </nav>
        </div>
      </div>
    </footer>
  );
}
