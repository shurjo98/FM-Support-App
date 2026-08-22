export type IssueType =
  | "THREAD_BREAKING"
  | "STITCH_SKIPPING"
  | "NEEDLE_BREAKING"
  | "TENSION_PROBLEM"
  | "FABRIC_NOT_FEEDING"
  | "BOBBIN_PROBLEM"
  | "NOISE"
  | "MACHINE_NOT_STARTING"
  | "ERROR_CODE"
  | "THREAD_TRIMMER_FAULT"
  | "OIL_LEAKAGE"
  | "OVERHEATING"
  | "OTHER";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED";

export interface WorkerTicket {
  id: string;
  issueType: IssueType;
  description: string;
  status: TicketStatus;
  machineName: string;
  assignedTo: string | null;
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  ticketCount: number;
  tickets: WorkerTicket[];
}

export interface Factory {
  id: string;
  name: string;
  location?: string;
  workerCount: number;
  ticketCount: number;
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  workers: Worker[];
}

export interface DashboardResponse {
  totals: {
    factoryCount: number;
    workerCount: number;
    ticketCount: number;
  };
  factories: Factory[];
}

export interface AssignmentTicket {
  ticketId: string;
  factoryName: string;
  workerName: string;
  machineName: string;
  issueType: IssueType;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

export interface Assignment {
  technicianId: string;
  technicianName: string;
  ticketCount: number;
  tickets: AssignmentTicket[];
}

export interface AssignmentsResponse {
  assignments: Assignment[];
  unassigned: {
    ticketCount: number;
    tickets: AssignmentTicket[];
  };
}

// Role *is* the designation — one person can hold several (e.g.
// "Technician" + "Marketing"), picked from a curated list or typed in
// manually. "Admin"/"Manager" among them (case-insensitive) grant the
// matching permission level — see src/permissions.ts.
export interface InternalAccountLite {
  id: string;
  name: string;
  roles: string[];
  avatarUrl?: string | null;
  skills?: string[];
}

export interface TeamGoal {
  id: string;
  title: string;
  description?: string | null;
  targetValue: number;
  currentValue: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskColumn = "BACKLOG" | "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
// Which internal Kanban board a task lives on.
export type TaskTeam = "Software" | "Hardware";
export type TaskEventType = "CREATED" | "MOVED" | "PRIORITY_CHANGED" | "ASSIGNED" | "DUE_DATE_CHANGED" | "TEAM_CHANGED";

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

// A task can have one Lead (owns it, like a striker who scores) plus any
// number of Assists (like a teammate who sets up the goal) — useful when a
// job needs people with different skill sets working together.
export type TaskAssigneeRole = "LEAD" | "ASSIST";

export interface TaskAssignee {
  accountId: string;
  name: string;
  avatarUrl?: string | null;
  role: TaskAssigneeRole;
}

export interface InternalTask {
  id: string;
  title: string;
  description?: string;
  column: TaskColumn;
  priority: TaskPriority;
  team: TaskTeam;
  assignees: TaskAssignee[];
  dueDate?: string | null;
  createdByAccountId: string;
  createdByName: string;
  relatedTicketId?: string;
  organizationId?: string | null;
  organizationName?: string | null;
  region?: string | null;
  // Restricted tasks are hidden from everyone except the creator, anyone in
  // allowedAccountIds, and GM-role accounts — see permissions.ts's isGm.
  restricted: boolean;
  allowedAccountIds: string[];
  events: TaskEvent[];
  comments: TaskComment[];
  createdAt: string;
  updatedAt: string;
}

// Fixed list of factory regions used for filtering across the internal dashboard.
export const REGIONS = ["Dhaka", "Cumilla", "Chittagong", "Ashulia", "Gazipur", "Narayanganj"] as const;
export type Region = (typeof REGIONS)[number];

export interface FactoryAccount {
  id: string;
  name: string;
  location: string | null;
  region: Region | null;
  portalUserId: string | null;
  hasCredentials: boolean;
  contactPerson: string | null;
  contactPhone: string | null;
  machineCount: number | null;
  workerCount: number | null;
  buyerBrands: string | null;
  notes: string | null;
}

export interface InternalNotification {
  id: string;
  message: string;
  taskId: string;
  triggeredByAccountId: string;
  triggeredByName: string;
  recipientAccountId?: string | null;
  isMention: boolean;
  read: boolean;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  accountId: string;
  name: string;
}

export type MachineCategory = "lockstitch" | "overlock" | "template" | "interlock" | "welting";
export type ProductLine = "SEWING" | "AUTOMATED";

export interface Machine {
  id: string;
  name: string;
  model: string;
  organizationId: string;
  productLine: ProductLine;
  category?: MachineCategory;
  imageUrl?: string;
  images?: string[];
  description?: string;
}

export interface MachineInstance {
  id: string;
  serialNumber: string;
  machineId: string;
  organizationId: string;
  location?: string;
}

export type ServiceStatus = "ok" | "due_soon" | "overdue" | "unscheduled";

// One row in a factory's full equipment list — FM catalog machines and
// other-brand machines the customer registered themselves, side by side.
export interface EquipmentItem {
  id: string;
  serialNumber: string;
  machineId: string | null;
  organizationId: string;
  location?: string | null;
  displayName: string;
  displayBrand: string;
  displayCategory?: string | null;
  isCatalogMachine: boolean;
  imageUrl?: string | null;
  lastServicedAt: string | null;
  serviceIntervalMonths: number | null;
  nextServiceDue: string | null;
  serviceStatus: ServiceStatus;
}

export interface NeedleProduct {
  id: string;
  name: string;
  system: string;
  brand: string;
  imageUrl: string;
  description?: string;
}

export interface SparePart {
  id: string;
  name: string;
  compatibleWith: string;
  imageUrl?: string;
  description?: string;
}

export type UserRole = "OPERATOR" | "IE";

export interface CustomerUser {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  groupId: string | null;
}

export interface CreateTicketResponse {
  ticket: {
    id: string;
    machineId: string;
    serialNumber?: string;
    issueType: IssueType;
    description: string;
    status: TicketStatus;
    aiSuggestion?: {
      text: string;
      fromCache: boolean;
      creditsUsed: number;
    };
    createdAt: string;
  };
  remainingCredits: number;
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

export interface CustomerTicket {
  id: string;
  machineId: string;
  serialNumber?: string;
  createdByUserId: string;
  issueType: IssueType;
  description: string;
  status: TicketStatus;
  aiSuggestion?: {
    text: string;
    fromCache: boolean;
    creditsUsed: number;
  };
  events: TicketEvent[];
  attachments?: TicketAttachment[];
  createdAt: string;
}

export type PurchaseItemType = "MACHINE" | "NEEDLE" | "SPARE_PART";

export interface Purchase {
  id: string;
  organizationId: string;
  organizationName: string;
  itemType: PurchaseItemType;
  itemName: string;
  machineModel?: string;
  needleSystem?: string;
  sparePartName?: string;
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
}

export type ReorderStatus = "PENDING" | "CONFIRMED" | "FULFILLED";

export interface ReorderRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  requestedByUserId: string;
  requestedByName: string;
  itemType: PurchaseItemType;
  itemName: string;
  needleSystem?: string;
  sparePartName?: string;
  machineModel?: string;
  serialNumber?: string;
  quantity: number;
  status: ReorderStatus;
  createdAt: string;
}

export type PortalSection =
  | "overview"
  | "equipment"
  | "sewing"
  | "automated"
  | "needles"
  | "spareparts"
  | "garments"
  | "tickets"
  | "purchases"
  | "settings";

export type NotificationChannel = "SMS" | "WHATSAPP";
export type NotificationStatus = "SIMULATED" | "SENT" | "FAILED";

export interface NotificationLogEntry {
  id: string;
  organizationId: string;
  factoryName: string;
  toPhone?: string;
  channel: NotificationChannel;
  message: string;
  status: NotificationStatus;
  createdAt: string;
}

export interface PortalSearchResult {
  action: "navigate" | "answer";
  section?: PortalSection;
  message: string;
  kb?: {
    model: string;
    code?: string;
    title: string;
    steps: string[];
    ambiguous?: boolean;
    translated?: boolean;
  };
}

export type GarmentType = "SHIRTS" | "PANTS" | "JEANS";

export interface GarmentProcess {
  name: string;
  description: string;
  machines: Machine[];
  needles: NeedleProduct[];
}

export interface GarmentRecommendation {
  garment: GarmentType;
  name: string;
  description: string;
  machines: Machine[];
  needles: NeedleProduct[];
  processes?: GarmentProcess[];
}

// ─── GM approval workflows ───────────────────────────────────────────────────
// Five request types, all reviewed/signed off by whoever holds the "GM" role
// (see permissions.ts's isGm). Backend reshapes all 5 into this one shape
// (src/routes/approvals.ts's serialize()) so list/detail UI can stay generic;
// `detail` carries the type-specific fields.
export type ApprovalType = "demo" | "leave" | "discount" | "qingke" | "warranty";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface DemoApprovalDetail {
  prospectCompany: string;
  contactPerson: string | null;
  contactPhone: string | null;
  machineOrProduct: string;
  proposedDate: string | null;
  location: string | null;
  purpose: string | null;
}

export interface LeaveRequestDetail {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
}

export interface DiscountApprovalDetail {
  organizationId: string;
  organizationName: string | null;
  itemOrQuoteDescription: string;
  originalAmount: number;
  discountPercent: number | null;
  discountAmount: number | null;
  reason: string | null;
}

export interface HospitalityApprovalDetail {
  organizationId: string | null;
  organizationName: string | null;
  venue: string | null;
  eventDate: string | null;
  amount: number;
  attendees: string | null;
  purpose: string | null;
}

export interface WarrantyClaimAttachment {
  id: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
}

export interface WarrantyClaimDetail {
  organizationId: string;
  organizationName: string | null;
  machineId: string | null;
  serialNumber: string | null;
  customMachineName: string | null;
  issueDescription: string;
  claimType: string;
  attachments: WarrantyClaimAttachment[];
}

export type ApprovalDetail =
  | DemoApprovalDetail
  | LeaveRequestDetail
  | DiscountApprovalDetail
  | HospitalityApprovalDetail
  | WarrantyClaimDetail;

export interface ApprovalRequestLite {
  id: string;
  type: ApprovalType;
  label: string;
  status: ApprovalStatus;
  requestedByAccountId: string;
  requestedByName: string;
  summary: string;
  decisionNote: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
  detail: ApprovalDetail;
}

export interface ContentCard {
  id: string;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  imageUrl: string;
  images: string[];
  published: boolean;
  order: number;
  createdByAccountId: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
