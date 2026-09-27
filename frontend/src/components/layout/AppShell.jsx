// The page frame: sticky header on top, the routed page in <main>, and the CTA footer at the bottom.
import Footer from "./Footer.jsx";
import Header from "./Header.jsx";
import styles from "./AppShell.module.css";
// Stacks the header, the page content and the footer so the footer always sits at the bottom.
export default function AppShell({ children }) {
  return (
    <>
      <Header />
      <main id="main" className={styles.main}>
        {children}
      </main>
      <Footer />
    </>
  );
}
