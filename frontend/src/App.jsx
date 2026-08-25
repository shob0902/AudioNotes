import { AnimatePresence } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";

import AppShell from "./components/layout/AppShell.jsx";
import PageTransition from "./components/layout/PageTransition.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ParticleBackground from "./components/ParticleBackground.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import Architecture from "./pages/Architecture.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import NoteDetail from "./pages/NoteDetail.jsx";
import NotFound from "./pages/NotFound.jsx";
import Settings from "./pages/Settings.jsx";
import Signup from "./pages/Signup.jsx";

/** Wraps a page in the sidebar/topbar shell + transition, optionally
 * requiring a logged-in user. Keeps the route table below free of
 * repeated AppShell/PageTransition/ProtectedRoute nesting. */
function ShellPage({ children, requireAuth = true }) {
  return (
    <AppShell>
      <PageTransition>
        <ErrorBoundary>{requireAuth ? <ProtectedRoute>{children}</ProtectedRoute> : children}</ErrorBoundary>
      </PageTransition>
    </AppShell>
  );
}

export default function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <ToastProvider>
        <ParticleBackground />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public, unshelled — full-screen pages, no sidebar. "/" is the
                marketing landing page; it redirects to /dashboard itself if
                you're already logged in (see Landing.jsx). */}
            <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />

            {/* Public but shelled — informational pages, no login required. */}
            <Route path="/architecture" element={<ShellPage requireAuth={false}><Architecture /></ShellPage>} />
            <Route path="*" element={<ShellPage requireAuth={false}><NotFound /></ShellPage>} />

            {/* Require a logged-in user — each account sees only its own notes. */}
            <Route path="/dashboard" element={<ShellPage><Dashboard /></ShellPage>} />
            <Route path="/notes/:id" element={<ShellPage><NoteDetail /></ShellPage>} />
            <Route path="/settings" element={<ShellPage><Settings /></ShellPage>} />
          </Routes>
        </AnimatePresence>
      </ToastProvider>
    </AuthProvider>
  );
}
