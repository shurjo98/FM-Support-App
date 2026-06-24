import { useState } from "react";
import { createReorder } from "../api";
import type { CustomerUser, PurchaseItemType } from "../types";
import { useLang } from "./i18n";

export default function ReorderButton({
  user,
  itemType,
  itemName,
  needleProductId,
  sparePartId,
  machineId,
  serialNumber,
  defaultQuantity,
  onRequested,
}: {
  user: CustomerUser;
  itemType: PurchaseItemType;
  itemName: string;
  needleProductId?: string;
  sparePartId?: string;
  machineId?: string;
  serialNumber?: string;
  defaultQuantity: number;
  onRequested?: () => void;
}) {
  const { t } = useLang();
  const [quantity, setQuantity] = useState(defaultQuantity);
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");

  async function handleReorder() {
    setStatus("submitting");
    try {
      await createReorder({
        organizationId: user.organizationId,
        requestedByUserId: user.id,
        itemType,
        itemName,
        needleProductId,
        sparePartId,
        machineId,
        serialNumber,
        quantity,
      });
      setStatus("done");
      onRequested?.();
    } catch {
      setStatus("idle");
    }
  }

  if (status === "done") {
    return <span className="cust-reorder-done">✓ {t("reorder.requested")}</span>;
  }

  return (
    <span className="cust-reorder-control">
      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
      />
      <button className="cust-button-secondary" onClick={handleReorder} disabled={status === "submitting"}>
        {status === "submitting" ? t("reorder.requesting") : t("reorder.button")}
      </button>
    </span>
  );
}
