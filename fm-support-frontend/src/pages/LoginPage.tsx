import { useState, type FormEvent } from "react";
import { login } from "../api";

export default function LoginPage({
  onLogin,
}: {
  onLogin: (token: string, name: string) => void;
}) {
  const [accountId, setAccountId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(accountId, password);
      onLogin(result.token, result.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Internal Team Login</h1>
        <p className="subtitle">Sign in to view the internal support dashboard</p>

        <label>
          Account ID
          <input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
