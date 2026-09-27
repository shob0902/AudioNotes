// The sticky header: brand on the left, the floating black pill nav in the middle, a CTA link on the right.
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOnlineStatus } from "../../hooks/useOnlineStatus.js";
import {
  ArrowIcon,
  BookIcon,
  DashboardIcon,
  HomeIcon,
  SettingsIcon,
  SparkleIcon,
  StarIcon,
} from "../icons.jsx";
import styles from "./Header.module.css";
const AUTHED_NAV = [
  { to: "/dashboard", filter: null, icon: DashboardIcon, label: "Dashboard" },
  { to: "/dashboard", filter: "completed", icon: SparkleIcon, label: "Summaries" },
  { to: "/dashboard", filter: "favorites", icon: StarIcon, label: "Favorites" },
  { to: "/architecture", filter: null, icon: BookIcon, label: "Docs" },
  { to: "/settings", filter: null, icon: SettingsIcon, label: "Settings" },
];
const GUEST_NAV = [
  { to: "/", filter: null, icon: HomeIcon, label: "Home" },
  { to: "/architecture", filter: null, icon: BookIcon, label: "Docs" },
  { to: "/login", filter: null, icon: ArrowIcon, label: "Log in" },
];
// Works out whether a nav item matches the current path and dashboard filter.
function isItemActive(item, pathname, currentFilter, currentAction) {
  if (item.to !== pathname) return false;
  if (item.to !== "/dashboard") return true;
  return (item.filter ?? null) === (currentFilter ?? null) && !currentAction;
}
// Renders the offline strip, then the brand, the pill nav and the right-hand link.
export default function Header() {
  const { isAuthenticated } = useAuth();
  const online = useOnlineStatus();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentFilter = searchParams.get("filter");
  const currentAction = searchParams.get("action");
  const items = isAuthenticated ? AUTHED_NAV : GUEST_NAV;
  const cta = isAuthenticated
    ? { to: "/dashboard?action=upload", label: "Upload new" }
    : { to: "/signup", label: "Get started" };
  return (
    <>
      {!online && (
        <div className={styles.offline} role="alert">
          You're offline // changes will fail until you reconnect
        </div>
      )}
      <header className={styles.header}>
        <div className={`page ${styles.inner}`}>
          <Link to="/" className={styles.brand} aria-label="AudioNotes home">
            <span className={styles.brandMark} aria-hidden="true">
              A
            </span>
            <span className={styles.wordmark}>AudioNotes</span>
          </Link>
          <nav aria-label="Primary" className={`${styles.nav} onDark`}>
            {items.map((item) => {
              const active = isItemActive(item, location.pathname, currentFilter, currentAction);
              const Icon = item.icon;
              const search = item.filter ? `?filter=${item.filter}` : "";
              return (
                <Link
                  key={item.label}
                  to={`${item.to}${search}`}
                  className={`${styles.navLink} ${active ? styles.navActive : ""}`}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                >
                  <Icon className={styles.navIcon} />
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <Link to={cta.to} className={styles.cta}>
            {cta.label}
          </Link>
        </div>
      </header>
    </>
  );
}
