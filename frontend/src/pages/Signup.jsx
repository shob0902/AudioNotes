// The signup page with the email and password form for creating an account.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import { MicIcon } from "../components/icons.jsx";
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
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card variant="elevated-lg" className="w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 animate-float items-center justify-center rounded-xl bg-primary text-white shadow-soft">
            <MicIcon className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-bold text-ink">Create your account</h1>
          <p className="text-sm text-muted">Your recordings and summaries stay private to you.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-glass-border bg-elevated px-3.5 py-2.5 text-sm text-ink shadow-inset transition-shadow duration-300 placeholder:text-muted focus:border-primary/50 focus:shadow-soft-hover focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-glass-border bg-elevated px-3.5 py-2.5 text-sm text-ink shadow-inset transition-shadow duration-300 placeholder:text-muted focus:border-primary/50 focus:shadow-soft-hover focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>
          <ErrorBanner message={error} />
          <Button type="submit" variant="primary" size="md" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating account..." : "Sign up"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
