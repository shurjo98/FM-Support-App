export type IssueType = "THREAD_BREAKING" | "STITCH_SKIPPING" | "FABRIC_NOT_FEEDING";
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

export interface LoginResponse {
  token: string;
  accountId: string;
  name: string;
}

export type MachineCategory = "lockstitch" | "overlock" | "template" | "interlock";
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

export type UserRole = "OPERATOR" | "IE";

export interface CustomerUser {
  id: string;
  name: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
}

export interface CreateTicketResponse {
  ticket: {
    id: string;
    machineId: string;
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

export interface CustomerTicket {
  id: string;
  machineId: string;
  createdByUserId: string;
  issueType: IssueType;
  description: string;
  status: TicketStatus;
  aiSuggestion?: {
    text: string;
    fromCache: boolean;
    creditsUsed: number;
  };
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
  serialNumber?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
}
