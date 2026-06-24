import MachineIssueSection from "./MachineIssueSection";
import type { CustomerUser } from "../types";

export default function AutomatedMachinesPage({ user }: { user: CustomerUser }) {
  return (
    <MachineIssueSection
      user={user}
      productLine="AUTOMATED"
      introKey="machines.intro.automated"
    />
  );
}
