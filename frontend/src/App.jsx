// Root component that sets up the providers and the whole route table.
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
// Wraps a page in the shell and transition, and optionally behind a login check.
function ShellPage({ children, requireAuth = true }) {
  return (
    <AppShell>
      <PageTransition>
        <ErrorBoundary>{requireAuth ? <ProtectedRoute>{children}</ProtectedRoute> : children}</ErrorBoundary>
      </PageTransition>
    </AppShell>
  );
}
// Declares every route, splitting them into full-screen, shelled public, and protected pages.
export default function App() {
  const location = useLocation();
  return (
    <AuthProvider>
      <ToastProvider>
        <ParticleBackground />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageTransition><Landing /></PageTransition>} />
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
            <Route path="/architecture" element={<ShellPage requireAuth={false}><Architecture /></ShellPage>} />
            <Route path="*" element={<ShellPage requireAuth={false}><NotFound /></ShellPage>} />
            <Route path="/dashboard" element={<ShellPage><Dashboard /></ShellPage>} />
            <Route path="/notes/:id" element={<ShellPage><NoteDetail /></ShellPage>} />
            <Route path="/settings" element={<ShellPage><Settings /></ShellPage>} />
          </Routes>
        </AnimatePresence>
      </ToastProvider>
    </AuthProvider>
  );
}
