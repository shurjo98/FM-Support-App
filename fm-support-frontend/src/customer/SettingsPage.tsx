import type { CustomerUser } from "../types";
import { useLang } from "./i18n";

export default function SettingsPage({
  user,
  onSwitchAccount,
}: {
  user: CustomerUser;
  onSwitchAccount: () => void;
}) {
  const { t } = useLang();

  return (
    <div className="cust-card" style={{ maxWidth: 480 }}>
      <div className="cust-settings-row">
        <span className="cust-settings-label">{t("settings.name")}</span>
        <span className="cust-settings-value">{user.name}</span>
      </div>
      <div className="cust-settings-row">
        <span className="cust-settings-label">{t("settings.factory")}</span>
        <span className="cust-settings-value">{user.organizationName}</span>
      </div>
      <div className="cust-settings-row">
        <span className="cust-settings-label">{t("settings.role")}</span>
        <span className="cust-settings-value">{t("role.ie")}</span>
      </div>
      <div className="cust-settings-row">
        <span className="cust-settings-label">{t("settings.account")}</span>
        <button className="cust-button-secondary" onClick={onSwitchAccount}>
          {t("settings.switchAccount")}
        </button>
      </div>
      <p className="cust-empty" style={{ marginTop: 14 }}>
        {t("settings.demoNotice")}
      </p>
    </div>
  );
}
