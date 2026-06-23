import MachineIssueSection from "./MachineIssueSection";
import type { CustomerUser } from "../types";

export default function SewingMachinesPage({ user }: { user: CustomerUser }) {
  return (
    <MachineIssueSection
      user={user}
      productLine="SEWING"
      intro="Lockstitch and overlock machines for everyday garment sewing. Select your machine, describe the problem, and get instant AI guidance."
    />
  );
}
