import { useState } from "react";
import { useVault } from "../hooks/useVault";

/**
 * VaultEntry – the zero-signup landing screen.
 *
 * Two modes:
 *   "create"  – generate a new vault.  User picks a PIN; the vault code is
 *               shown afterwards so they can copy it to a second device.
 *   "join"    – paste an existing vault code + enter its PIN.
 */
export default function Auth() {
  const { createVault, joinVault, loading, error } = useVault();

  const [mode, setMode] = useState("create"); // "create" | "join"
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [vaultCode, setVaultCode] = useState(""); // only used in "join" mode
  const [createdToken, setCreatedToken] = useState(null); // shown after successful create
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState("");

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const showPassword = false; // keep PIN fields always masked

  /**
   * Strip everything that is NOT a valid base64url character.
   * Mobile keyboards / clipboards can inject newlines, zero-width spaces,
   * BOM, and other invisible Unicode into pasted text.  The vault token is
   * purely [A-Za-z0-9_-], so anything else is noise.
   */
  const sanitizeToken = (raw) => raw.replace(/[^A-Za-z0-9_-]/g, "");

  /**
   * Trim all Unicode whitespace from both ends of a string.
   * String.prototype.trim() only removes ASCII whitespace; mobile
   * keyboards can append U+00A0 (nbsp) or other whitespace-class chars.
   */
  const sanitizePin = (raw) =>
    raw.replace(/^[\s\u00A0\uFEFF]+|[\s\u00A0\uFEFF]+$/g, "");

  const reset = () => {
    setPin("");
    setPinConfirm("");
    setVaultCode("");
    setLocalError("");
  };

  const switchMode = (next) => {
    setMode(next);
    reset();
  };

  // ------------------------------------------------------------------
  // Create
  // ------------------------------------------------------------------
  const handleCreate = async (event) => {
    event.preventDefault();
    setLocalError("");
    if (pin.length < 4) {
      setLocalError("PIN must be at least 4 characters.");
      return;
    }
    if (pin !== pinConfirm) {
      setLocalError("PINs do not match.");
      return;
    }
    const token = await createVault(pin);
    if (token) {
      setCreatedToken(token);
      reset();
    }
  };

  // ------------------------------------------------------------------
  // Join
  // ------------------------------------------------------------------
  const handleJoin = async (event) => {
    event.preventDefault();
    setLocalError("");
    const cleanCode = sanitizeToken(vaultCode);
    const cleanPin = sanitizePin(pin);
    if (!cleanCode) {
      setLocalError("paste your vault code first.");
      return;
    }
    if (!cleanPin) {
      setLocalError("enter your PIN.");
      return;
    }
    await joinVault(cleanCode, cleanPin);
  };

  // ------------------------------------------------------------------
  // Copy vault code to clipboard
  // ------------------------------------------------------------------
  const handleCopy = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text manually
      setLocalError("copy the code manually from below.");
    }
  };

  // ------------------------------------------------------------------
  // Render: post-creation confirmation (show the vault code)
  // ------------------------------------------------------------------
  if (createdToken) {
    return (
      <div className="auth-shell minimal">
        <div className="auth-card minimal" aria-live="polite">
          <header className="auth-card-header">
            <p>vault created</p>
            <h2>your vault code</h2>
          </header>
          <p className="auth-hint">
            this is <strong>not</strong> your PIN. it is a long random string
            that identifies your vault. copy it and paste it on your other
            devices when you join.
          </p>
          <div className="vault-code-display">
            <code className="vault-code-text">{createdToken}</code>
            <button
              type="button"
              className="vault-code-copy"
              onClick={handleCopy}
              aria-label="copy vault code"
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <p className="auth-hint">
            on the other device: tap &ldquo;join vault&rdquo;, paste this code,
            then enter the PIN you just set. tap &ldquo;done&rdquo; here to
            start adding tasks.
          </p>
          <button
            type="button"
            className="button primary"
            onClick={() => setCreatedToken(null)}
          >
            done
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render: create / join forms
  // ------------------------------------------------------------------
  const activeError = localError || error;

  return (
    <div className="auth-shell minimal">
      <div className="auth-card minimal" aria-live="polite">
        <header className="auth-card-header">
          <p>welcome</p>
          <h2>DoWhat</h2>
        </header>

        {/* mode switcher */}
        <div className="vault-mode-tabs" role="group" aria-label="vault action">
          <button
            type="button"
            className={`vault-tab${mode === "create" ? " active" : ""}`}
            onClick={() => switchMode("create")}
            aria-pressed={mode === "create"}
          >
            new vault
          </button>
          <button
            type="button"
            className={`vault-tab${mode === "join" ? " active" : ""}`}
            onClick={() => switchMode("join")}
            aria-pressed={mode === "join"}
          >
            join vault
          </button>
        </div>

        {/* ---- CREATE ---- */}
        {mode === "create" && (
          <form className="auth-form" onSubmit={handleCreate}>
            <p className="auth-hint">
              create a vault to store your tasks. you will get a vault code to
              share with your other devices — no account needed.
            </p>
            <label htmlFor="create-pin" className="auth-label">
              PIN
            </label>
            <input
              id="create-pin"
              className="auth-input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="at least 4 characters"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
            <label htmlFor="create-pin-confirm" className="auth-label">
              confirm PIN
            </label>
            <input
              id="create-pin-confirm"
              className="auth-input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="same PIN again"
              value={pinConfirm}
              onChange={(e) => setPinConfirm(e.target.value)}
              required
            />
            {activeError && <p className="auth-message">{activeError}</p>}
            <div className="auth-actions">
              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                {loading ? "creating…" : "create vault"}
              </button>
            </div>
          </form>
        )}

        {/* ---- JOIN ---- */}
        {mode === "join" && (
          <form className="auth-form" onSubmit={handleJoin}>
            <p className="auth-hint">
              paste the vault code from another device, then enter the PIN that
              was set when the vault was created.
            </p>
            <label htmlFor="join-code" className="auth-label">
              vault code
            </label>
            <input
              id="join-code"
              className="auth-input auth-input--code"
              type="text"
              autoComplete="off"
              placeholder="paste vault code here"
              value={vaultCode}
              onChange={(e) => setVaultCode(e.target.value)}
              required
            />
            <p className="auth-hint auth-hint--code">
              a long random string from the device that created the vault
              &mdash; not your PIN.
            </p>
            <label htmlFor="join-pin" className="auth-label">
              PIN
            </label>
            <input
              id="join-pin"
              className="auth-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
            {activeError && <p className="auth-message">{activeError}</p>}
            <div className="auth-actions">
              <button
                type="submit"
                className="button primary"
                disabled={loading}
              >
                {loading ? "joining…" : "join vault"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
