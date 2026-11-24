// Settings panel for personal API keys: create one for Claude Code, see the setup command, and revoke old keys.
import { useEffect, useState } from "react";
import Button from "./ui/Button.jsx";
import Modal from "./ui/Modal.jsx";
import TextField from "./ui/TextField.jsx";
import CopyButton from "./CopyButton.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { API_ORIGIN, createApiKey, listApiKeys, revokeApiKey } from "../services/api.js";
import { GITHUB_REPO_URL } from "../utils/links.js";
import styles from "./ApiKeysPanel.module.css";
// Builds the one-line `claude mcp add` command for a key; uvx installs the MCP server straight from the repo.
export function buildClaudeCommand(key) {
  return [
    "claude mcp add audionotes --scope user",
    `-e AUDIONOTES_API_URL=${API_ORIGIN}`,
    `-e AUDIONOTES_API_KEY=${key}`,
    `-- uvx --from git+${GITHUB_REPO_URL}#subdirectory=mcp-server audionotes-mcp`,
  ].join(" ");
}
// Formats an ISO timestamp as a short local date, or a dash when missing.
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
}
// Loads the keys on mount and handles create and revoke, keeping a just-created key visible until dismissed.
export default function ApiKeysPanel() {
  const notify = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Claude Code");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [pendingRevoke, setPendingRevoke] = useState(null);
  useEffect(() => {
    let cancelled = false;
    listApiKeys()
      .then((data) => !cancelled && setKeys(data.items))
      .catch((err) => !cancelled && notify(err.message, { type: "error" }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [notify]);
  const handleCreate = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const created = await createApiKey(name.trim());
      const { key, ...listed } = created;
      setKeys((prev) => [listed, ...prev]);
      setNewKey(key);
      setName("Claude Code");
    } catch (err) {
      notify(err.message, { type: "error" });
    } finally {
      setCreating(false);
    }
  };
  const handleRevoke = async () => {
    const target = pendingRevoke;
    setPendingRevoke(null);
    try {
      await revokeApiKey(target.id);
      setKeys((prev) => prev.filter((k) => k.id !== target.id));
      notify(`Revoked "${target.name}"`);
    } catch (err) {
      notify(err.message, { type: "error" });
    }
  };
  return (
    <section className={styles.panel} aria-labelledby="api-keys-title">
      <h2 id="api-keys-title" className={styles.panelTitle}>
        API keys {"//"} Claude Code
      </h2>
      <p className={styles.text}>
        Connect Audio Notes to Claude Code (or any MCP client) so you can list, read, upload and summarize your notes
        from the terminal. Create a key, then run the command it gives you. Requires{" "}
        <a href="https://docs.astral.sh/uv/" target="_blank" rel="noopener noreferrer" className={styles.link}>
          uv
        </a>
        .
      </p>
      {newKey && (
        <div className={styles.reveal} role="status">
          <p className={styles.revealTitle}>Copy your key now. You won&apos;t be able to see it again.</p>
          <div className={styles.codeRow}>
            <code className={styles.code}>{newKey}</code>
            <CopyButton text={newKey} label="Copy key" toastMessage="API key copied" />
          </div>
          <p className={styles.label}>Add it to Claude Code</p>
          <div className={styles.codeRow}>
            <code className={styles.code}>{buildClaudeCommand(newKey)}</code>
            <CopyButton text={buildClaudeCommand(newKey)} label="Copy command" toastMessage="Command copied" />
          </div>
          <Button variant="secondary" size="sm" onClick={() => setNewKey(null)}>
            Done
          </Button>
        </div>
      )}
      <form className={styles.form} onSubmit={handleCreate}>
        <TextField
          id="api-key-name"
          label="Key name"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Claude Code on my laptop"
        />
        <Button type="submit" variant="primary" disabled={creating || !name.trim()}>
          {creating ? "Creating…" : "Create key"}
        </Button>
      </form>
      {loading ? (
        <p className={styles.muted}>Loading keys…</p>
      ) : keys.length === 0 ? (
        <p className={styles.muted}>No API keys yet.</p>
      ) : (
        <ul className={styles.list}>
          {keys.map((k) => (
            <li key={k.id} className={styles.row}>
              <div className={styles.rowText}>
                <p className={styles.rowName}>{k.name}</p>
                <p className={styles.label}>
                  {k.prefix}… · created {formatDate(k.created_at)} · last used{" "}
                  {k.last_used_at ? formatDate(k.last_used_at) : "never"}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => setPendingRevoke(k)}>
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={Boolean(pendingRevoke)}
        title="Revoke this API key?"
        description={
          pendingRevoke
            ? `Anything using "${pendingRevoke.name}" (${pendingRevoke.prefix}…) will stop working immediately.`
            : ""
        }
        confirmLabel="Revoke"
        danger
        onConfirm={handleRevoke}
        onCancel={() => setPendingRevoke(null)}
      />
    </section>
  );
}
