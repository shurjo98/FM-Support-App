import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import AssignmentsPage from "./pages/AssignmentsPage";

const TOKEN_KEY = "fm_internal_token";
const NAME_KEY = "fm_internal_name";

// TEMP: login is disabled while we're testing the apps end-to-end.
// Flip back to true to require internal login before launch (also flip
// REQUIRE_LOGIN back to true in src/routes/dashboard.ts on the backend).
const REQUIRE_LOGIN = false;

type Tab = "dashboard" | "assignments";

export default function InternalApp() {
  const [token, setToken] = useState<string | null>(() =>
    REQUIRE_LOGIN ? sessionStorage.getItem(TOKEN_KEY) : "test-bypass-token"
  );
  const [name, setName] = useState<string | null>(() =>
    REQUIRE_LOGIN ? sessionStorage.getItem(NAME_KEY) : "Test User (login disabled)"
  );
  const [tab, setTab] = useState<Tab>("dashboard");

  function handleLogin(newToken: string, newName: string) {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    sessionStorage.setItem(NAME_KEY, newName);
    setToken(newToken);
    setName(newName);
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(NAME_KEY);
    if (REQUIRE_LOGIN) {
      setToken(null);
      setName(null);
    }
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div>
      <header className="app-header">
        <div className="app-header-title">
          <strong>FM Support — Internal</strong>
          <span className="welcome">Signed in as {name}</span>
        </div>
        <nav className="app-tabs">
          <button className={tab === "dashboard" ? "active" : ""} onClick={() => setTab("dashboard")}>
            By Factory
          </button>
          <button className={tab === "assignments" ? "active" : ""} onClick={() => setTab("assignments")}>
            Assignments
          </button>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          Log out
        </button>
      </header>

      {tab === "dashboard" ? (
        <DashboardPage token={token} onUnauthorized={handleLogout} />
      ) : (
        <AssignmentsPage token={token} onUnauthorized={handleLogout} />
      )}
    </div>
  );
}
