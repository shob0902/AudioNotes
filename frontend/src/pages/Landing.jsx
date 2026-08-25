import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { MicIcon, SparkleIcon, UploadCloudIcon } from "../components/icons.jsx";

const STEPS = [
  {
    icon: UploadCloudIcon,
    title: "Upload",
    description: "Drop in a recording — a meeting, a lecture, a voice memo. MP3, WAV, M4A, and more.",
  },
  {
    icon: MicIcon,
    title: "Transcribe",
    description: "Gnani's speech-to-text turns your audio into an accurate, readable transcript.",
  },
  {
    icon: SparkleIcon,
    title: "Summarize",
    description: "Groq's LLM extracts key points, action items, decisions, and topics — instantly searchable.",
  },
];

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If ProtectedRoute sent us here (state.from set), forward that along to
  // Login so it can still send the user back to the page they wanted after
  // they sign in — landing on "/" doesn't have to break that chain.
  const loginState = location.state?.from ? { from: location.state.from } : undefined;

  // Someone already logged in has no reason to see marketing copy — send
  // them straight to their notes. Imperative (not <Navigate>) for the same
  // reason as ProtectedRoute: avoids fighting AnimatePresence's exit-hold.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 animate-float items-center justify-center rounded-xl bg-primary text-white shadow-soft">
            <MicIcon className="h-[18px] w-[18px]" />
          </span>
          <span className="text-base font-bold text-ink">AudioNotes</span>
        </div>
        <Link to="/login" state={loginState} className="text-sm font-medium text-ink hover:text-primary">
          Log in
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-12 text-center sm:px-6 sm:pt-20">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-3xl font-bold tracking-tight text-ink sm:text-5xl"
        >
          Turn recordings into clear, useful notes
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="mx-auto mt-4 max-w-xl text-base text-muted sm:text-lg"
        >
          Upload any recording and let AI do the rest — a full transcript plus a structured summary with key
          points, action items, and decisions, ready in minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/signup">
            <Button variant="primary" size="lg">
              Get Started
            </Button>
          </Link>
          <Link to="/login" state={loginState}>
            <Button variant="secondary" size="lg">
              I already have an account
            </Button>
          </Link>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 + index * 0.1, ease: "easeOut" }}
              >
                <Card variant="elevated" className="h-full p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-semibold text-ink">{step.title}</p>
                  <p className="mt-1 text-sm text-muted">{step.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-16 text-xs text-muted">
          Curious how it works under the hood?{" "}
          <Link to="/architecture" className="font-medium text-primary hover:underline">
            Read the architecture
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
