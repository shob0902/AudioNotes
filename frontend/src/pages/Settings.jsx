import { Link, useNavigate } from "react-router-dom";

import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import { SettingsIcon } from "../components/icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const GITHUB_REPO_URL = import.meta.env.VITE_GITHUB_REPO_URL || "https://github.com/<your-username>/audio-notes";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <SettingsIcon className="h-5 w-5 text-primary" />
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">Account and app information.</p>
      </div>

      <Card variant="elevated" className="p-6">
        <p className="text-sm font-semibold text-ink">Account</p>
        <p className="mt-1 text-sm text-muted">{user?.email}</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          Log out
        </Button>
      </Card>

      <Card variant="elevated" className="divide-y divide-black/5 p-6">
        <div className="pb-4">
          <p className="text-sm font-semibold text-ink">Audio Notes Platform</p>
          <p className="mt-1 text-sm text-muted">
            Upload audio, get an AI transcript via Gnani Speech-to-Text, and a structured summary via Groq.
          </p>
        </div>
        <div className="py-4">
          <p className="text-sm font-semibold text-ink">Source code</p>
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-primary hover:underline">
            {GITHUB_REPO_URL}
          </a>
        </div>
        <div className="pt-4">
          <p className="text-sm font-semibold text-ink">How it works</p>
          <p className="mt-1 text-sm text-muted">
            See the{" "}
            <Link to="/architecture" className="text-primary hover:underline">
              architecture page
            </Link>{" "}
            for the full processing pipeline.
          </p>
        </div>
      </Card>
    </div>
  );
}
