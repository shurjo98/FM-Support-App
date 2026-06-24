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

export type MachineCategory = "lockstitch" | "overlock" | "template" | "interlock" | "welting";

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
  // Additional gallery photos shown in the detail view, beyond imageUrl.
  images?: string[];
  description?: string;
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
  phone?: string;
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

// Internal staff who log into the internal dashboard. Plaintext password is
// intentional for now — this is a prototype-only auth scheme, not for
// production use. Managers (and admins) can create/assign/move tasks on the
// team task board; technicians can only view it.
export type InternalRole = "MANAGER" | "TECHNICIAN" | "ADMIN";

export interface InternalAccount {
  id: string;
  accountId: string;
  password: string;
  name: string;
  role: InternalRole;
}

export interface SparePart {
  id: string;
  name: string;
  compatibleWith: string;
  imageUrl?: string;
  description?: string;
}

export type PurchaseItemType = "MACHINE" | "NEEDLE" | "SPARE_PART";

export interface Purchase {
  id: string;
  organizationId: string;
  itemType: PurchaseItemType;
  itemName: string;
  machineId?: string;
  needleProductId?: string;
  sparePartId?: string;
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  purchaseDate: string;
}

export type TicketEventType = "RAISED" | "ASSIGNED" | "STATUS_CHANGED" | "COMMENT" | "ATTACHMENT";

export interface TicketEvent {
  id: string;
  type: TicketEventType;
  description: string;
  authorName?: string;
  createdAt: string;
}

export type AttachmentKind = "image" | "video";

export interface TicketAttachment {
  id: string;
  kind: AttachmentKind;
  url: string;
  uploadedAt: string;
}

export interface Ticket {
  id: string;
  machineId: string;
  serialNumber?: string;
  createdByUserId: string;
  issueType: IssueType;
  description: string;

  aiSuggestion?: AiSuggestion;

  status: "OPEN" | "IN_PROGRESS" | "COMPLETED";
  technicianId?: string | null;
  technicianNotes?: string[];
  events: TicketEvent[];
  attachments?: TicketAttachment[];
  createdAt: string;
}

export type ReorderStatus = "PENDING" | "CONFIRMED" | "FULFILLED";

export interface ReorderRequest {
  id: string;
  organizationId: string;
  requestedByUserId: string;
  itemType: PurchaseItemType;
  itemName: string;
  needleProductId?: string;
  sparePartId?: string;
  machineId?: string;
  serialNumber?: string;
  quantity: number;
  status: ReorderStatus;
  createdAt: string;
}

// Demo-mode notification log: until a real SMS/WhatsApp provider is wired
// up, every "notification" is just simulated and recorded here so the
// internal team can see what would have been sent.
export type NotificationChannel = "SMS" | "WHATSAPP";
export type NotificationStatus = "SIMULATED" | "SENT" | "FAILED";

export interface NotificationLogEntry {
  id: string;
  organizationId: string;
  toPhone?: string;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  createdAt: string;
}

// Internal team task board (Kanban-style). Managers/admins create tasks,
// assign them, set priority, and set due dates. Anyone — including
// technicians — can move a task between columns; if a technician does the
// moving, the manager/admin get notified (see InternalNotification below).
export type TaskColumn = "BACKLOG" | "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskEventType = "CREATED" | "MOVED" | "PRIORITY_CHANGED" | "ASSIGNED" | "DUE_DATE_CHANGED";

export interface TaskEvent {
  id: string;
  type: TaskEventType;
  description: string;
  authorAccountId: string;
  authorName: string;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  authorAccountId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface InternalTask {
  id: string;
  title: string;
  description?: string;
  column: TaskColumn;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  createdByAccountId: string;
  relatedTicketId?: string;
  events: TaskEvent[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

// In-app alert shown to managers/admins when a technician moves a task —
// no SMS/email here, just a bell in the internal dashboard.
export interface InternalNotification {
  id: string;
  message: string;
  taskId: string;
  triggeredByAccountId: string;
  triggeredByName: string;
  read: boolean;
  createdAt: string;
}

// The portal search bar's AI agent either sends the customer to a section
// of the app or answers their question directly.
export type PortalSection =
  | "overview"
  | "sewing"
  | "automated"
  | "needles"
  | "spareparts"
  | "garments"
  | "tickets"
  | "purchases"
  | "settings";

export interface PortalSearchResult {
  action: "navigate" | "answer";
  section?: PortalSection;
  message: string;
}

// Garment-based buying guide: "what machine/needle should I use to sew
// jeans/pants/shirts?" — maps a garment type to the catalog items suited
// for sewing it.
export type GarmentType = "SHIRTS" | "PANTS" | "JEANS";

export interface GarmentProcessSeed {
  name: string;
  description: string;
  machineIds: string[];
  needleProductIds: string[];
}

export interface GarmentRecommendationSeed {
  garment: GarmentType;
  name: string;
  description: string;
  machineIds: string[];
  needleProductIds: string[];
  // Optional production-process breakdown (e.g. for Jeans: main seam,
  // pocket setting, waistband, etc.), each step with its own machine/needle.
  processes?: GarmentProcessSeed[];
}

