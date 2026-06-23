// src/types.ts

export type IssueType =
  | "THREAD_BREAKING"
  | "STITCH_SKIPPING"
  | "FABRIC_NOT_FEEDING";

export interface Organization {
  id: string;
  name: string;
  location?: string;
}

export type MachineCategory = "lockstitch" | "overlock" | "template" | "interlock";

// Our two machine product lines. Needles are a separate, non-machine
// product line (see NeedleProduct) since they aren't tracked as serialized
// equipment the way machines are.
export type ProductLine = "SEWING" | "AUTOMATED";

export interface Machine {
  id: string;
  name: string;
  model: string;
  organizationId: string;
  productLine: ProductLine;
  category?: MachineCategory;
  imageUrl?: string;
}

export interface NeedleProduct {
  id: string;
  name: string;
  system: string;
  brand: string;
  imageUrl: string;
  description?: string;
}

export interface MachineInstance {
  id: string;
  serialNumber: string;
  machineId: string;      
  organizationId: string;
  location?: string;
}

// Operators run the machines day-to-day but cannot raise support tickets —
// only the factory's Industrial Engineer (IE) is authorized to do that.
export type UserRole = "OPERATOR" | "IE";

export interface User {
  id: string;
  name: string;
  organizationId: string;
  role: UserRole;
  aiCredits: number;
}

export interface AiSuggestion {
  text: string;
  fromCache: boolean;
  creditsUsed: number;
}

export interface CachedAnswer {
  key: string;
  issueType: IssueType;
  text: string;
  createdAt: Date;
}

// Internal staff (technicians / admins) who log into the internal dashboard
// and can be assigned tickets. Plaintext password is intentional for now —
// this is a prototype-only auth scheme, not for production use.
export interface InternalAccount {
  id: string;
  accountId: string;
  password: string;
  name: string;
}

export type PurchaseItemType = "MACHINE" | "NEEDLE" | "SPARE_PART";

export interface Purchase {
  id: string;
  organizationId: string;
  itemType: PurchaseItemType;
  itemName: string;
  machineId?: string;
  needleProductId?: string;
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  purchaseDate: string;
}

export interface Ticket {
  id: string;
  machineId: string;
  createdByUserId: string;
  issueType: IssueType;
  description: string;

  aiSuggestion?: AiSuggestion;

  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
  technicianId?: string | null;
  technicianNotes?: string[];
  createdAt: string;
}

