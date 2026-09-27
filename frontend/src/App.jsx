// Root component that sets up the providers and the whole route table.
import { Route, Routes, useLocation } from "react-router-dom";
import AppShell from "./components/layout/AppShell.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
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
// Wraps a page that needs a logged-in user in the login check.
function Protected({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
// Declares every route inside the shared header/footer shell, re-running the fade-in on each navigation.
export default function App() {
  const location = useLocation();
  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell>
          <ErrorBoundary key={location.pathname}>
            <div className="fadeIn">
              <Routes location={location}>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/architecture" element={<Architecture />} />
                <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
                <Route path="/notes/:id" element={<Protected><NoteDetail /></Protected>} />
                <Route path="/settings" element={<Protected><Settings /></Protected>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </ErrorBoundary>
        </AppShell>
      </ToastProvider>
    </AuthProvider>
  );
}
