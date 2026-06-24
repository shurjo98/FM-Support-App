import MachineIssueSection from "./MachineIssueSection";
import type { CustomerUser } from "../types";

export default function SewingMachinesPage({ user }: { user: CustomerUser }) {
  return (
    <MachineIssueSection
      user={user}
      productLine="SEWING"
      introKey="machines.intro.sewing"
    />
  );
}
