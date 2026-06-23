import type {
  AssignmentsResponse,
  CreateTicketResponse,
  CustomerTicket,
  CustomerUser,
  DashboardResponse,
  IssueType,
  LoginResponse,
  Machine,
  NeedleProduct,
  ProductLine,
  Purchase,
  PurchaseItemType,
} from "./types";

export class UnauthorizedError extends Error {}

export async function login(accountId: string, password: string): Promise<LoginResponse> {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Login failed (${res.status})`);
  }
  return res.json();
}

async function authedGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new UnauthorizedError("Session expired, please log in again.");
  if (!res.ok) throw new Error(`Request to ${path} failed (${res.status})`);
  return res.json();
}

export function fetchDashboard(token: string): Promise<DashboardResponse> {
  return authedGet<DashboardResponse>("/dashboard", token);
}

export function fetchAssignments(token: string): Promise<AssignmentsResponse> {
  return authedGet<AssignmentsResponse>("/dashboard/assignments", token);
}

export async function fetchMachines(productLine?: ProductLine): Promise<Machine[]> {
  const search = productLine ? `?productLine=${productLine}` : "";
  const res = await fetch(`/machines${search}`);
  if (!res.ok) throw new Error(`Failed to load machines (${res.status})`);
  return res.json();
}

export async function fetchNeedleProducts(): Promise<NeedleProduct[]> {
  const res = await fetch("/needles");
  if (!res.ok) throw new Error(`Failed to load needle catalog (${res.status})`);
  return res.json();
}

export async function fetchCustomerUsers(): Promise<CustomerUser[]> {
  const res = await fetch("/users");
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
  return res.json();
}

export async function createTicket(payload: {
  machineId: string;
  createdByUserId: string;
  issueType: IssueType;
  description: string;
}): Promise<CreateTicketResponse> {
  const res = await fetch("/tickets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to submit ticket (${res.status})`);
  return body;
}

export async function fetchCustomerTickets(createdByUserId: string): Promise<CustomerTicket[]> {
  const res = await fetch(`/tickets?createdByUserId=${encodeURIComponent(createdByUserId)}`);
  if (!res.ok) throw new Error(`Failed to load ticket history (${res.status})`);
  return res.json();
}

export async function fetchPurchases(params: {
  organizationId?: string;
  itemType?: PurchaseItemType;
  query?: string;
}): Promise<Purchase[]> {
  const search = new URLSearchParams();
  if (params.organizationId) search.set("organizationId", params.organizationId);
  if (params.itemType) search.set("itemType", params.itemType);
  if (params.query) search.set("query", params.query);
  const res = await fetch(`/purchases?${search.toString()}`);
  if (!res.ok) throw new Error(`Failed to load purchase history (${res.status})`);
  return res.json();
}
