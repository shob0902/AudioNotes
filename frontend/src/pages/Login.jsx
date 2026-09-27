// The sign-in page: one "Continue with Google" button, which also creates the account on first visit.
import { Navigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import GoogleButton from "../components/GoogleButton.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import styles from "./Login.module.css";
// Sends signed-in users on to the dashboard, otherwise offers Google sign-in.
export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const redirectTo = location.state?.from || "/dashboard";
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;
  return (
    <AuthLayout
      eyebrow="Account // Sign in"
      headline={
        <>
          Sign
          <br />
          in.
        </>
      }
      lead="One click with your Google account. New here? Your account is created automatically."
      footer="We only read your name, email address and profile photo."
    >
      <p className={styles.panelTitle}>Welcome to Audio Notes</p>
      <GoogleButton from={redirectTo} block />
      <ul className={styles.points}>
        <li>No password to remember</li>
        <li>Your recordings stay private to your account</li>
      </ul>
    </AuthLayout>
  );
}
