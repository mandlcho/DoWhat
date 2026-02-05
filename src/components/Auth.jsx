import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  const getRedirectUrl = () => {
    const envUrl = import.meta.env.VITE_SITE_URL;
    if (envUrl) return envUrl;
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return undefined;
  };

  const handleSubmit = async (event, mode) => {
    event.preventDefault();
    if (loading) return;
    setMessage("");

    try {
      setLoading(true);
      const isSignup = mode === "signup";
      const { error } = isSignup
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: getRedirectUrl() }
          })
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
    <div className="auth-shell minimal">
      <div className="auth-card minimal" aria-live="polite">
        <header className="auth-card-header">
          <p>welcome</p>
          <h2>sign in to DoWhat</h2>
        </header>
        <form className="auth-form">
          <label htmlFor="email" className="auth-label">
            email
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
            password
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
              {showPassword ? "🙈" : "👁"}
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
              {loading ? "working…" : "log in"}
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={loading}
              onClick={(event) => handleSubmit(event, "signup")}
            >
              create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
