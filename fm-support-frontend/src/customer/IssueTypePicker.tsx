import type { IssueType } from "../types";
import { useLang, type TranslationKey } from "./i18n";

// Shared by MachineIssueSection (Sewing/Automated Machines) and EquipmentPage
// (My Equipment) so both "report an issue" flows offer the same categories
// and stay in sync as this list grows — previously each screen hardcoded
// its own 3-option copy of this array.
export const ISSUE_TYPE_OPTIONS: { value: IssueType; labelKey: TranslationKey; icon: string }[] = [
  { value: "THREAD_BREAKING", labelKey: "issue.threadBreaking", icon: "🧵" },
  { value: "STITCH_SKIPPING", labelKey: "issue.stitchSkipping", icon: "〰️" },
  { value: "NEEDLE_BREAKING", labelKey: "issue.needleBreaking", icon: "🪡" },
  { value: "TENSION_PROBLEM", labelKey: "issue.tensionProblem", icon: "🎚️" },
  { value: "FABRIC_NOT_FEEDING", labelKey: "issue.fabricNotFeeding", icon: "📐" },
  { value: "BOBBIN_PROBLEM", labelKey: "issue.bobbinProblem", icon: "🧶" },
  { value: "NOISE", labelKey: "issue.noise", icon: "🔊" },
  { value: "MACHINE_NOT_STARTING", labelKey: "issue.machineNotStarting", icon: "⚡" },
  { value: "ERROR_CODE", labelKey: "issue.errorCode", icon: "⚠️" },
  { value: "THREAD_TRIMMER_FAULT", labelKey: "issue.threadTrimmerFault", icon: "✂️" },
  { value: "OIL_LEAKAGE", labelKey: "issue.oilLeakage", icon: "🛢️" },
  { value: "OVERHEATING", labelKey: "issue.overheating", icon: "🔥" },
  { value: "OTHER", labelKey: "issue.other", icon: "❓" },
];

export default function IssueTypePicker({
  value,
  onChange,
}: {
  value: IssueType;
  onChange: (v: IssueType) => void;
}) {
  const { t } = useLang();
  return (
    <div className="cust-chip-row">
      {ISSUE_TYPE_OPTIONS.map((opt) => (
        <div
          key={opt.value}
          className={`cust-chip selectable ${value === opt.value ? "selected" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          <span className="cust-chip-icon">{opt.icon}</span>
          <span className="cust-chip-name">{t(opt.labelKey)}</span>
        </div>
      ))}
    </div>
  );
}
