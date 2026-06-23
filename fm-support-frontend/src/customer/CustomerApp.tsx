import { useState } from "react";
import "./customer.css";
import AccountPickerPage from "./AccountPickerPage";
import CustomerLayout, { type CustomerSection } from "./CustomerLayout";
import OverviewPage from "./OverviewPage";
import SewingMachinesPage from "./SewingMachinesPage";
import AutomatedMachinesPage from "./AutomatedMachinesPage";
import NeedlesPage from "./NeedlesPage";
import TicketHistoryPage from "./TicketHistoryPage";
import PurchaseHistoryPage from "./PurchaseHistoryPage";
import SettingsPage from "./SettingsPage";
import type { CustomerUser } from "../types";

const USER_KEY = "fm_customer_user";

export default function CustomerApp() {
  const [user, setUser] = useState<CustomerUser | null>(() => {
    const raw = sessionStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as CustomerUser) : null;
  });
  const [section, setSection] = useState<CustomerSection>("overview");

  function handlePick(picked: CustomerUser) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(picked));
    setUser(picked);
    setSection("overview");
  }

  function handleLogout() {
    sessionStorage.removeItem(USER_KEY);
    setUser(null);
  }

  if (!user) {
    return <AccountPickerPage onPick={handlePick} />;
  }

  return (
    <CustomerLayout
      active={section}
      onNavigate={setSection}
      userName={user.name}
      userRole={user.role}
      organizationName={user.organizationName}
      onLogout={handleLogout}
    >
      {section === "overview" && <OverviewPage user={user} onNavigate={setSection} />}
      {section === "sewing" && <SewingMachinesPage user={user} />}
      {section === "automated" && <AutomatedMachinesPage user={user} />}
      {section === "needles" && <NeedlesPage user={user} />}
      {section === "tickets" && <TicketHistoryPage user={user} />}
      {section === "purchases" && <PurchaseHistoryPage user={user} />}
      {section === "settings" && <SettingsPage user={user} onSwitchAccount={handleLogout} />}
    </CustomerLayout>
  );
}
