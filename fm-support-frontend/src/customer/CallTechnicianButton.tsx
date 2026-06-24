import { TECHNICIAN_PHONE } from "./constants";
import { useLang } from "./i18n";

export default function CallTechnicianButton() {
  const { t } = useLang();

  return (
    <a className="cust-call-button" href={`tel:${TECHNICIAN_PHONE}`}>
      📞 {t("support.callTechnician")} ({TECHNICIAN_PHONE})
    </a>
  );
}
