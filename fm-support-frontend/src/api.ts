import type {
  AssignmentsResponse,
  CreateTicketResponse,
  CustomerTicket,
  CustomerUser,
  DashboardResponse,
  GarmentRecommendation,
  InternalAccountLite,
  InternalNotification,
  InternalTask,
  IssueType,
  LoginResponse,
  Machine,
  MachineInstance,
  NeedleProduct,
  NotificationLogEntry,
  ProductLine,
  PortalSearchResult,
  Purchase,
  PurchaseItemType,
  ReorderRequest,
  SparePart,
  TaskColumn,
  TaskPriority,
} from "./types";

type SuggestionLang = "en" | "bn";

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

async function authedMutate<T>(
  path: string,
  token: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) throw new UnauthorizedError("Session expired, please log in again.");
  const responseBody = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(responseBody.error ?? `Request to ${path} failed (${res.status})`);
  return responseBody;
}

export function fetchDashboard(token: string): Promise<DashboardResponse> {
  return authedGet<DashboardResponse>("/dashboard", token);
}

export function fetchAssignments(token: string): Promise<AssignmentsResponse> {
  return authedGet<AssignmentsResponse>("/dashboard/assignments", token);
}

export function fetchInternalAccounts(token: string): Promise<InternalAccountLite[]> {
  return authedGet<InternalAccountLite[]>("/dashboard/accounts", token);
}

export function fetchTasks(token: string): Promise<InternalTask[]> {
  return authedGet<InternalTask[]>("/dashboard/tasks", token);
}

export function createTask(
  token: string,
  payload: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assigneeId?: string | null;
    column?: TaskColumn;
    dueDate?: string | null;
    actingAccountId: string;
  }
): Promise<InternalTask> {
  return authedMutate<InternalTask>("/dashboard/tasks", token, "POST", payload);
}

export function updateTask(
  token: string,
  taskId: string,
  payload: {
    column?: TaskColumn;
    priority?: TaskPriority;
    assigneeId?: string | null;
    title?: string;
    description?: string;
    dueDate?: string | null;
    actingAccountId: string;
  }
): Promise<InternalTask> {
  return authedMutate<InternalTask>(`/dashboard/tasks/${encodeURIComponent(taskId)}`, token, "PATCH", payload);
}

export function deleteTask(token: string, taskId: string, actingAccountId: string): Promise<{ ok: boolean }> {
  return authedMutate<{ ok: boolean }>(
    `/dashboard/tasks/${encodeURIComponent(taskId)}?actingAccountId=${encodeURIComponent(actingAccountId)}`,
    token,
    "DELETE"
  );
}

export function addTaskComment(
  token: string,
  taskId: string,
  text: string,
  actingAccountId: string
): Promise<InternalTask> {
  return authedMutate<InternalTask>(`/dashboard/tasks/${encodeURIComponent(taskId)}/comments`, token, "POST", {
    text,
    actingAccountId,
  });
}

export function fetchTaskNotifications(token: string): Promise<InternalNotification[]> {
  return authedGet<InternalNotification[]>("/dashboard/task-notifications", token);
}

export function markAllTaskNotificationsRead(token: string): Promise<{ ok: boolean }> {
  return authedMutate<{ ok: boolean }>("/dashboard/task-notifications/read-all", token, "PATCH");
}

export async function fetchMachines(productLine?: ProductLine, organizationId?: string): Promise<Machine[]> {
  const search = new URLSearchParams();
  if (productLine) search.set("productLine", productLine);
  if (organizationId) search.set("organizationId", organizationId);
  const qs = search.toString();
  const res = await fetch(`/machines${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error(`Failed to load machines (${res.status})`);
  return res.json();
}

export async function fetchNeedleProducts(): Promise<NeedleProduct[]> {
  const res = await fetch("/needles");
  if (!res.ok) throw new Error(`Failed to load needle catalog (${res.status})`);
  return res.json();
}

export async function fetchMachineInstances(machineId: string, organizationId: string): Promise<MachineInstance[]> {
  const res = await fetch(`/machines/${encodeURIComponent(machineId)}/instances?organizationId=${encodeURIComponent(organizationId)}`);
  if (!res.ok) throw new Error(`Failed to load machine serial numbers (${res.status})`);
  return res.json();
}

export async function fetchGarmentRecommendations(): Promise<GarmentRecommendation[]> {
  const res = await fetch("/garments");
  if (!res.ok) throw new Error(`Failed to load garment guide (${res.status})`);
  return res.json();
}

export async function fetchSpareParts(): Promise<SparePart[]> {
  const res = await fetch("/spareparts");
  if (!res.ok) throw new Error(`Failed to load spare parts catalog (${res.status})`);
  return res.json();
}

export async function fetchCustomerUsers(): Promise<CustomerUser[]> {
  const res = await fetch("/users");
  if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
  return res.json();
}

export async function createTicket(payload: {
  machineId: string;
  serialNumber: string;
  createdByUserId: string;
  issueType: IssueType;
  description: string;
  lang?: SuggestionLang;
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

export async function addTicketComment(ticketId: string, userId: string, text: string): Promise<CustomerTicket> {
  const res = await fetch(`/tickets/${encodeURIComponent(ticketId)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, text }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to add comment (${res.status})`);
  return body.ticket;
}

export async function fetchReorders(organizationId: string): Promise<ReorderRequest[]> {
  const res = await fetch(`/reorders?organizationId=${encodeURIComponent(organizationId)}`);
  if (!res.ok) throw new Error(`Failed to load reorder requests (${res.status})`);
  return res.json();
}

export async function uploadTicketAttachment(ticketId: string, file: File): Promise<CustomerTicket> {
  const res = await fetch(`/tickets/${encodeURIComponent(ticketId)}/attachments`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to upload attachment (${res.status})`);
  return body.ticket;
}

export async function fetchNotificationLog(token: string): Promise<NotificationLogEntry[]> {
  return authedGet<NotificationLogEntry[]>("/dashboard/notifications", token);
}

export async function searchPortal(query: string, lang: SuggestionLang): Promise<PortalSearchResult> {
  const res = await fetch("/ai/portal-search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, lang }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Search failed (${res.status})`);
  return body;
}

export async function createReorder(payload: {
  organizationId: string;
  requestedByUserId: string;
  itemType: PurchaseItemType;
  itemName: string;
  needleProductId?: string;
  sparePartId?: string;
  machineId?: string;
  serialNumber?: string;
  quantity: number;
}): Promise<ReorderRequest> {
  const res = await fetch("/reorders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to submit reorder (${res.status})`);
  return body;
}
