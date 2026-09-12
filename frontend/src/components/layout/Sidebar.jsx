// The navigation sidebar, in both its fixed desktop form and its mobile drawer form.
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  CloseIcon,
  DashboardIcon,
  MicIcon,
  SettingsIcon,
  SparkleIcon,
  StarIcon,
  UploadCloudIcon,
} from "../icons.jsx";
const NAV_ITEMS = [
  { to: "/dashboard", filter: null, icon: DashboardIcon, label: "Dashboard" },
  { to: "/dashboard", filter: "all", icon: MicIcon, label: "My Recordings" },
  { to: "/dashboard", filter: "completed", icon: SparkleIcon, label: "Summaries" },
  { to: "/dashboard", filter: null, action: "upload", icon: UploadCloudIcon, label: "Upload New" },
  { to: "/dashboard", filter: "favorites", icon: StarIcon, label: "Favorites" },
  { to: "/settings", filter: null, icon: SettingsIcon, label: "Settings" },
];
// Works out whether a nav item matches the current path, filter and action.
function isItemActive(item, pathname, currentFilter, currentAction) {
  if (item.to !== pathname) return false;
  if (item.action) return currentAction === item.action;
  return (item.filter ?? null) === (currentFilter ?? null) && !currentAction;
}
// Renders the nav links and highlights whichever one matches the current URL.
function NavList({ onNavigate }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const currentFilter = searchParams.get("filter");
  const currentAction = searchParams.get("action");
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isItemActive(item, location.pathname, currentFilter, currentAction);
        const search = item.action ? `?action=${item.action}` : item.filter ? `?filter=${item.filter}` : "";
        const Icon = item.icon;
        return (
          <NavLink
            key={item.label}
            to={`${item.to}${search}`}
            onClick={onNavigate}
            className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${active ? "" : "hover:bg-surface hover:shadow-soft active:shadow-inset"}`}
          >
            {active && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 rounded-xl bg-surface-hover shadow-inset-glow"
              />
            )}
            <motion.span
              whileHover={{ x: 2 }}
              className={`relative z-10 flex items-center gap-3 ${active ? "text-primary" : "text-muted"}`}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className={active ? "text-ink" : ""}>{item.label}</span>
            </motion.span>
          </NavLink>
        );
      })}
    </nav>
  );
}
// The app name and logo block at the top of the sidebar.
function SidebarBrand() {
  return (
    <div className="mb-8 flex items-center gap-2.5 px-1">
      <span className="flex h-9 w-9 animate-float items-center justify-center rounded-xl bg-primary text-white shadow-soft">
        <MicIcon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="text-base font-bold leading-tight text-ink">AudioNotes</p>
        <p className="text-[11px] leading-tight text-muted">Record. Transcribe. Summarize.</p>
      </div>
    </div>
  );
}
// Shows the signed-in email and a log-out button, and renders nothing when signed out.
function UserFooter() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mt-auto pt-6">
      <div className="rounded-xl bg-elevated border border-glass-border px-3.5 py-3 shadow-inset">
        <p className="truncate text-xs font-medium text-ink" title={user.email}>
          {user.email}
        </p>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="mt-1 text-xs font-medium text-primary hover:underline"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
// The always-visible sidebar shown from the large breakpoint upwards.
export function DesktopSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 animate-slide-in flex-col border-r border-glass-border bg-sidebar px-4 py-6 lg:flex">
      <SidebarBrand />
      <NavList />
      <UserFooter />
    </aside>
  );
}
// The slide-in drawer version of the sidebar used on small screens.
export function MobileSidebar({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-app/70 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-glass-border bg-sidebar px-4 py-6 shadow-soft-lg lg:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <SidebarBrand />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-muted hover:bg-primary-light"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <NavList onNavigate={onClose} />
            <UserFooter />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
