import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (event, mode) => {
    event.preventDefault();
    if (loading) return;
    setMessage("");

    try {
      setLoading(true);
      const isSignup = mode === "signup";
      const { error } = isSignup
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      setMessage(
        isSignup
          ? "Signup successful! Check your email to confirm your account."
          : "Logged in successfully."
      );
    } catch (error) {
      setMessage(error?.error_description || error?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <p className="auth-kicker">kanban, everywhere</p>
        <h1>Sign in to keep your board in sync.</h1>
        <p className="auth-subtext">
          Stay on top of backlog, in-progress, and done with realtime updates across
          your devices. Log in or create an account to continue.
        </p>
        <div className="auth-bullets" role="list">
          <div role="listitem">email + password, powered by supabase auth</div>
          <div role="listitem">real-time task updates and labels</div>
          <div role="listitem">works on mobile, tablet, and desktop</div>
        </div>
        <p className="auth-footnote">No tracking, just your tasks — securely stored.</p>
      </div>

      <div className="auth-card" aria-live="polite">
        <header className="auth-card-header">
          <p>welcome</p>
          <h2>Sign in to kanban</h2>
        </header>
        <form className="auth-form">
          <label htmlFor="email" className="auth-label">
            Email
          </label>
          <input
            id="email"
            className="auth-input"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="password" className="auth-label">
            Password
          </label>
          <div className="auth-password-row">
            <input
              id="password"
              className="auth-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              className="auth-toggle-password"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "hide" : "show"}
            </button>
          </div>

          {message ? <p className="auth-message">{message}</p> : null}

          <div className="auth-actions">
            <button
              type="submit"
              className="button primary"
              disabled={loading}
              onClick={(event) => handleSubmit(event, "login")}
            >
              {loading ? "Working…" : "Log in"}
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={loading}
              onClick={(event) => handleSubmit(event, "signup")}
            >
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
