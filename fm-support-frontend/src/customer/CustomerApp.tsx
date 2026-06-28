import { useState } from "react";
import "./customer.css";
import AccountPickerPage from "./AccountPickerPage";
import CustomerLayout, { type CustomerSection } from "./CustomerLayout";
import OverviewPage from "./OverviewPage";
import EquipmentPage from "./EquipmentPage";
import SewingMachinesPage from "./SewingMachinesPage";
import AutomatedMachinesPage from "./AutomatedMachinesPage";
import NeedlesPage from "./NeedlesPage";
import SparePartsPage from "./SparePartsPage";
import GarmentGuidePage from "./GarmentGuidePage";
import TicketHistoryPage from "./TicketHistoryPage";
import PurchaseHistoryPage from "./PurchaseHistoryPage";
import SettingsPage from "./SettingsPage";
import { LanguageProvider } from "./i18n";
import type { CustomerUser } from "../types";

const USER_KEY = "fm_customer_user";

function CustomerAppInner() {
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
      organizationName={user.organizationName}
      onLogout={handleLogout}
    >
      {section === "overview" && <OverviewPage user={user} onNavigate={setSection} />}
      {section === "equipment" && <EquipmentPage user={user} />}
      {section === "sewing" && <SewingMachinesPage user={user} />}
      {section === "automated" && <AutomatedMachinesPage user={user} />}
      {section === "needles" && <NeedlesPage user={user} />}
      {section === "spareparts" && <SparePartsPage user={user} />}
      {section === "garments" && <GarmentGuidePage user={user} />}
      {section === "tickets" && <TicketHistoryPage user={user} />}
      {section === "purchases" && <PurchaseHistoryPage user={user} />}
      {section === "settings" && <SettingsPage user={user} onSwitchAccount={handleLogout} />}
    </CustomerLayout>
  );
}

export default function CustomerApp() {
  return (
    <LanguageProvider>
      <CustomerAppInner />
    </LanguageProvider>
  );
}
