import { useEffect, useState } from "react";
import { fetchAnalyticsOverview, type AnalyticsOverview } from "../api";
import type { CustomerUser } from "../types";

const MACHINE_COST_KEY = "fm_robotics_machine_cost";
const CYCLE_TIME_KEY = "fm_robotics_cycle_time";
const LABOR_KEY = "fm_robotics_labor";
const SHIFTS_KEY = "fm_robotics_shifts";

function currency(n: number) {
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid rgba(148,163,184,0.12)", padding: "9px 0" }}>
      <div>
        <span style={{ fontSize: 13 }}>{label}</span>
        {sub && <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{sub}</div>}
      </div>
      <span style={{ fontWeight: 700, fontSize: 15 }}>{value}</span>
    </div>
  );
}

function InputRow({ label, value, unit, onChange, type = "number", min, step }: {
  label: string; value: number | string; unit?: string;
  onChange: (v: string) => void; type?: string; min?: number; step?: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(148,163,184,0.1)", padding: "8px 0" }}>
      <label style={{ fontSize: 13, flex: 1 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input
          type={type}
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 90, padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(148,163,184,0.3)", background: "rgba(255,255,255,0.08)", color: "white", fontSize: 13 }}
        />
        {unit && <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 30 }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function RoboticsPage({ user }: { user: CustomerUser }) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);

  // ROI inputs
  const [machineCost, setMachineCost] = useState(() => Number(localStorage.getItem(MACHINE_COST_KEY) ?? 0) || 2500000);
  const [cycleTimeMin, setCycleTimeMin] = useState(() => Number(localStorage.getItem(CYCLE_TIME_KEY) ?? 0) || 45);
  const [laborPerDay, setLaborPerDay] = useState(() => Number(localStorage.getItem(LABOR_KEY) ?? 0) || 4000);
  const [shiftsPerDay, setShiftsPerDay] = useState(() => Number(localStorage.getItem(SHIFTS_KEY) ?? 0) || 2);

  useEffect(() => { localStorage.setItem(MACHINE_COST_KEY, String(machineCost)); }, [machineCost]);
  useEffect(() => { localStorage.setItem(CYCLE_TIME_KEY, String(cycleTimeMin)); }, [cycleTimeMin]);
  useEffect(() => { localStorage.setItem(LABOR_KEY, String(laborPerDay)); }, [laborPerDay]);
  useEffect(() => { localStorage.setItem(SHIFTS_KEY, String(shiftsPerDay)); }, [shiftsPerDay]);

  useEffect(() => {
    fetchAnalyticsOverview(user.organizationId).then(setOverview).catch(() => null);
  }, [user.organizationId]);

  // Calculations
  const workingHoursPerDay = shiftsPerDay * 8;
  const cyclesPerDay = Math.floor((workingHoursPerDay * 60) / cycleTimeMin);
  const laborSavedPerMonth = laborPerDay * 26;

  // Downtime from analytics: avg downtime hours per week × 52 / 12 = monthly
  const avgMonthlyDowntimeHours = overview
    ? (overview.avgResolutionHours * overview.totalTickets) / 12
    : null;
  const downtimeSavedBdt = avgMonthlyDowntimeHours
    ? Math.round(avgMonthlyDowntimeHours * (laborPerDay / workingHoursPerDay))
    : null;

  const monthlyBenefit = laborSavedPerMonth + (downtimeSavedBdt ?? 0);
  const paybackMonths = monthlyBenefit > 0 ? Math.ceil(machineCost / monthlyBenefit) : null;
  const roi5yr = monthlyBenefit > 0 ? Math.round(((monthlyBenefit * 60 - machineCost) / machineCost) * 100) : null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Input panel */}
        <div className="cust-card">
          <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700 }}>Your factory inputs</h3>
          <InputRow label="Automation machine cost" value={machineCost} unit="৳" onChange={(v) => setMachineCost(Number(v))} min={0} step={50000} />
          <InputRow label="Cycle time per garment" value={cycleTimeMin} unit="min" onChange={(v) => setCycleTimeMin(Number(v))} min={1} step={1} />
          <InputRow label="Daily labor cost replaced" value={laborPerDay} unit="৳" onChange={(v) => setLaborPerDay(Number(v))} min={0} step={100} />
          <InputRow label="Shifts per day" value={shiftsPerDay} unit="" onChange={(v) => setShiftsPerDay(Number(v))} min={1} step={1} />
          <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
            Edit any value above. Results update instantly. Downtime savings are pulled from your factory's real ticket history.
          </div>
        </div>

        {/* Results panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="cust-card">
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Estimated payback period</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: paybackMonths && paybackMonths <= 24 ? "#16a34a" : "#d97706" }}>
              {paybackMonths != null ? `${paybackMonths} months` : "—"}
            </div>
            {paybackMonths != null && (
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                {paybackMonths <= 18 ? "Excellent ROI — typical buyer automation payback is 18–36 months." : paybackMonths <= 36 ? "Good ROI — within the industry norm." : "Above average payback period. Consider phased rollout."}
              </div>
            )}
          </div>
          <div className="cust-card">
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>5-year ROI</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: roi5yr != null && roi5yr > 0 ? "#16a34a" : "#9ca3af" }}>
              {roi5yr != null ? `${roi5yr}%` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly savings breakdown */}
      <div className="cust-card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Monthly savings breakdown</h3>
        <Row label="Labor savings" value={currency(laborSavedPerMonth)} sub={`${currency(laborPerDay)}/day × 26 working days`} />
        <Row
          label="Downtime cost avoided"
          value={downtimeSavedBdt != null ? currency(downtimeSavedBdt) : "—"}
          sub={avgMonthlyDowntimeHours != null ? `Based on ${avgMonthlyDowntimeHours.toFixed(1)} avg downtime hrs/month from your tickets` : "Loading from your ticket history…"}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Total monthly benefit</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: "#4fb3e8" }}>{currency(monthlyBenefit)}</span>
        </div>
      </div>

      {/* Output stats */}
      <div className="cust-card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>Productivity projection</h3>
        <Row label="Cycles per day" value={cyclesPerDay.toLocaleString()} sub={`${workingHoursPerDay}h working × 60 / ${cycleTimeMin} min`} />
        <Row label="Cycles per month (26 days)" value={(cyclesPerDay * 26).toLocaleString()} />
        <Row label="Cycles per year" value={(cyclesPerDay * 312).toLocaleString()} />
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
        <strong style={{ color: "#9ca3af" }}>Disclaimer:</strong> These projections are estimates based on the inputs you provide. Actual ROI depends on machine utilization, maintenance, operator training, and production mix. Contact FM Corporation for a detailed site assessment.
      </div>
    </div>
  );
}
