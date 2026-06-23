import MachineIssueSection from "./MachineIssueSection";
import type { CustomerUser } from "../types";

export default function AutomatedMachinesPage({ user }: { user: CustomerUser }) {
  return (
    <MachineIssueSection
      user={user}
      productLine="AUTOMATED"
      intro="Computerized template and interlock machines for automated pattern sewing. Select your machine, describe the problem, and get instant AI guidance."
    />
  );
}
