import { useState } from "react";
import LoginPage from "./pages/LoginPage";
import InternalAccountPicker from "./pages/InternalAccountPicker";
import DashboardPage from "./pages/DashboardPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import NotificationsPage from "./pages/NotificationsPage";
import TaskBoardPage from "./pages/TaskBoardPage";
import InternalLayout, { type InternalTab } from "./InternalLayout";
import type { InternalAccountLite } from "./types";

const TOKEN_KEY = "fm_internal_token";
const NAME_KEY = "fm_internal_name";
const ACTING_ACCOUNT_KEY = "fm_internal_acting_account";

// TEMP: login is disabled while we're testing the apps end-to-end.
// Flip back to true to require internal login before launch (also flip
// REQUIRE_LOGIN back to true in src/routes/dashboard.ts on the backend).
const REQUIRE_LOGIN = false;

export default function InternalApp() {
  const [token, setToken] = useState<string | null>(() =>
    REQUIRE_LOGIN ? sessionStorage.getItem(TOKEN_KEY) : "test-bypass-token"
  );
  const [name, setName] = useState<string | null>(() =>
    REQUIRE_LOGIN ? sessionStorage.getItem(NAME_KEY) : "Test User (login disabled)"
  );
  const [actingAccount, setActingAccount] = useState<InternalAccountLite | null>(() => {
    const raw = sessionStorage.getItem(ACTING_ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as InternalAccountLite) : null;
  });
  const [tab, setTab] = useState<InternalTab>("dashboard");

  function handleLogin(newToken: string, newName: string) {
    sessionStorage.setItem(TOKEN_KEY, newToken);
    sessionStorage.setItem(NAME_KEY, newName);
    setToken(newToken);
    setName(newName);
  }

  function handlePickAccount(account: InternalAccountLite) {
    sessionStorage.setItem(ACTING_ACCOUNT_KEY, JSON.stringify(account));
    setActingAccount(account);
  }

  function handleSwitchAccount() {
    sessionStorage.removeItem(ACTING_ACCOUNT_KEY);
    setActingAccount(null);
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(NAME_KEY);
    sessionStorage.removeItem(ACTING_ACCOUNT_KEY);
    setActingAccount(null);
    if (REQUIRE_LOGIN) {
      setToken(null);
      setName(null);
    }
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!actingAccount) {
    return <InternalAccountPicker token={token} onPick={handlePickAccount} />;
  }

  return (
    <InternalLayout
      active={tab}
      onNavigate={setTab}
      actingAccount={actingAccount}
      onSwitchAccount={handleSwitchAccount}
      onLogout={handleLogout}
    >
      {tab === "dashboard" && <DashboardPage token={token} onUnauthorized={handleLogout} />}
      {tab === "assignments" && <AssignmentsPage token={token} onUnauthorized={handleLogout} />}
      {tab === "tasks" && (
        <TaskBoardPage token={token} actingAccount={actingAccount} onUnauthorized={handleLogout} />
      )}
      {tab === "notifications" && <NotificationsPage token={token} onUnauthorized={handleLogout} />}
    </InternalLayout>
  );
}
