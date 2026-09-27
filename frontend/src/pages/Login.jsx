// The login page with the email and password form.
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Button from "../components/ui/Button.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import TextField from "../components/ui/TextField.jsx";
import { ArrowIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ApiError } from "../services/api.js";
// Submits the credentials and, on success, sends the user on to wherever they were headed.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectTo = location.state?.from || "/dashboard";
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <AuthLayout
      eyebrow="Account // Log in"
      headline={
        <>
          Welcome
          <br />
          back.
        </>
      }
      lead="Log in to see your recordings, transcripts and summaries."
      footer={
        <>
          No account yet? <Link to="/signup">Sign up</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <TextField
          id="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        <ErrorBanner message={error} />
        <Button type="submit" size="lg" disabled={isSubmitting} block>
          {isSubmitting ? (
            <Spinner label="Logging in…" />
          ) : (
            <>
              Log in
              <ArrowIcon className="arrow" />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
