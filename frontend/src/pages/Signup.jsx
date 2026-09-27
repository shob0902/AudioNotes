// The signup page with the email and password form for creating an account.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import Button from "../components/ui/Button.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import TextField from "../components/ui/TextField.jsx";
import { ArrowIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ApiError } from "../services/api.js";
// Creates the account and drops the new user straight onto their dashboard.
export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await signup(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <AuthLayout
      eyebrow="Account // Sign up"
      headline={
        <>
          Start
          <br />
          here.
        </>
      }
      lead="Your recordings and summaries stay private to you."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
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
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          hint="Min. 8 characters"
        />
        <ErrorBanner message={error} />
        <Button type="submit" size="lg" disabled={isSubmitting} block>
          {isSubmitting ? (
            <Spinner label="Creating account…" />
          ) : (
            <>
              Create account
              <ArrowIcon className="arrow" />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
