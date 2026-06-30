import type {
  AssignmentsResponse,
  ContentCard,
  CreateTicketResponse,
  CustomerTicket,
  CustomerUser,
  DashboardResponse,
  EquipmentItem,
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
  TeamGoal,
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

export function createInternalAccount(
  token: string,
  payload: {
    name: string;
    accountId: string;
    password: string;
    roles: string[];
    skills?: string[];
    actingAccountId: string;
  }
): Promise<InternalAccountLite> {
  return authedMutate<InternalAccountLite>("/dashboard/accounts", token, "POST", payload);
}

export function updateInternalAccount(
  token: string,
  id: string,
  payload: Partial<{
    name: string;
    accountId: string;
    password: string;
    roles: string[];
    skills: string[];
  }> & {
    actingAccountId: string;
  }
): Promise<InternalAccountLite> {
  return authedMutate<InternalAccountLite>(`/dashboard/accounts/${encodeURIComponent(id)}`, token, "PATCH", payload);
}

export function deleteInternalAccount(token: string, id: string, actingAccountId: string): Promise<{ ok: boolean }> {
  return authedMutate<{ ok: boolean }>(
    `/dashboard/accounts/${encodeURIComponent(id)}?actingAccountId=${encodeURIComponent(actingAccountId)}`,
    token,
    "DELETE"
  );
}

export async function uploadAvatar(token: string, accountId: string, file: File): Promise<InternalAccountLite> {
  const res = await fetch(`/dashboard/accounts/${encodeURIComponent(accountId)}/avatar`, {
    method: "POST",
    headers: { "Content-Type": file.type, Authorization: `Bearer ${token}` },
    body: file,
  });
  if (res.status === 401) throw new UnauthorizedError("Session expired, please log in again.");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to upload avatar (${res.status})`);
  return body;
}

export function fetchTeamGoals(token: string): Promise<TeamGoal[]> {
  return authedGet<TeamGoal[]>("/dashboard/goals", token);
}

export function createTeamGoal(
  token: string,
  payload: {
    title: string;
    description?: string;
    targetValue: number;
    currentValue?: number;
    unit: string;
    actingAccountId: string;
  }
): Promise<TeamGoal> {
  return authedMutate<TeamGoal>("/dashboard/goals", token, "POST", payload);
}

export function updateTeamGoal(
  token: string,
  id: string,
  payload: Partial<Pick<TeamGoal, "title" | "description" | "targetValue" | "currentValue" | "unit">> & {
    actingAccountId: string;
  }
): Promise<TeamGoal> {
  return authedMutate<TeamGoal>(`/dashboard/goals/${encodeURIComponent(id)}`, token, "PATCH", payload);
}

export function deleteTeamGoal(token: string, id: string, actingAccountId: string): Promise<{ ok: boolean }> {
  return authedMutate<{ ok: boolean }>(
    `/dashboard/goals/${encodeURIComponent(id)}?actingAccountId=${encodeURIComponent(actingAccountId)}`,
    token,
    "DELETE"
  );
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
    leadId?: string | null;
    assistIds?: string[];
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
    leadId?: string | null;
    assistIds?: string[];
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

export function fetchTaskNotifications(token: string, accountId: string): Promise<InternalNotification[]> {
  return authedGet<InternalNotification[]>(`/dashboard/task-notifications?accountId=${encodeURIComponent(accountId)}`, token);
}

export function markAllTaskNotificationsRead(token: string, actingAccountId: string): Promise<{ ok: boolean }> {
  return authedMutate<{ ok: boolean }>("/dashboard/task-notifications/read-all", token, "PATCH", { actingAccountId });
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  const res = await fetch("/push/vapid-public-key");
  if (!res.ok) return null;
  const body = await res.json();
  return body.publicKey ?? null;
}

export async function subscribePush(
  accountId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<{ ok: boolean }> {
  const res = await fetch("/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, subscription }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to subscribe to push (${res.status})`);
  return body;
}

export async function unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
  const res = await fetch("/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  });
  return res.json().catch(() => ({ ok: false }));
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

export async function fetchMyEquipment(organizationId: string): Promise<EquipmentItem[]> {
  const res = await fetch(`/machines/instances?organizationId=${encodeURIComponent(organizationId)}`);
  if (!res.ok) throw new Error(`Failed to load equipment list (${res.status})`);
  return res.json();
}

export async function registerCustomMachine(payload: {
  organizationId: string;
  serialNumber: string;
  brand: string;
  customName: string;
  category?: string;
  location?: string;
}): Promise<EquipmentItem> {
  const res = await fetch("/machines/instances", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to register machine (${res.status})`);
  return body;
}

export async function markMachineServiced(id: string): Promise<EquipmentItem> {
  const res = await fetch(`/machines/instances/${encodeURIComponent(id)}/service`, { method: "PATCH" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to update service record (${res.status})`);
  return body;
}

export async function updateMachineInstance(
  id: string,
  payload: { serviceIntervalMonths?: number | null; location?: string }
): Promise<EquipmentItem> {
  const res = await fetch(`/machines/instances/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to update machine (${res.status})`);
  return body;
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

export async function fetchContentCards(publishedOnly: boolean): Promise<ContentCard[]> {
  const res = await fetch(`/content${publishedOnly ? "?published=true" : ""}`);
  if (!res.ok) throw new Error(`Failed to load content (${res.status})`);
  return res.json();
}

export async function uploadContentImage(file: File): Promise<{ url: string }> {
  const res = await fetch("/content/upload", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to upload image (${res.status})`);
  return body;
}

export async function createContentCard(payload: {
  title: string;
  subtitle?: string;
  body?: string;
  imageUrl: string;
  images?: string[];
  published?: boolean;
  order?: number;
  actingAccountId: string;
}): Promise<ContentCard> {
  const res = await fetch("/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const responseBody = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(responseBody.error ?? `Failed to create content card (${res.status})`);
  return responseBody;
}

export async function updateContentCard(
  id: string,
  payload: Partial<Pick<ContentCard, "title" | "subtitle" | "body" | "imageUrl" | "images" | "published" | "order">>
): Promise<ContentCard> {
  const res = await fetch(`/content/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to update content card (${res.status})`);
  return body;
}

export async function deleteContentCard(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/content/${encodeURIComponent(id)}`, { method: "DELETE" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Failed to delete content card (${res.status})`);
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

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  thisMonthDowntimeHours: number;
  avgResolutionHours: number;
  openTickets: number;
  inProgressTickets: number;
  totalTickets: number;
  fleet: { total: number; ok: number; due_soon: number; overdue: number; unscheduled: number };
  needleSpendThisMonth: number;
  needleSpendLastMonth: number;
  topMachines: { serialNumber: string; label: string; hours: number; count: number }[];
}

export interface AnalyticsFleetMachine {
  id: string;
  serialNumber: string;
  displayName: string;
  displayBrand: string;
  displayCategory: string | null;
  productLine: string | null;
  location: string | null;
  lastServicedAt: string | null;
  serviceIntervalMonths: number | null;
  nextServiceDue: string | null;
  serviceStatus: "ok" | "due_soon" | "overdue" | "unscheduled";
  isCatalogMachine: boolean;
}

export interface AnalyticsNeedleMonth {
  month: string;
  quantity: number;
  spend: number;
  items: string[];
}

export async function fetchAnalyticsOverview(organizationId: string): Promise<AnalyticsOverview> {
  const res = await fetch(`/analytics/overview?organizationId=${encodeURIComponent(organizationId)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to load analytics");
  return body;
}

export async function fetchAnalyticsFleet(organizationId: string): Promise<AnalyticsFleetMachine[]> {
  const res = await fetch(`/analytics/fleet?organizationId=${encodeURIComponent(organizationId)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to load fleet data");
  return body;
}

export async function fetchAnalyticsNeedles(
  organizationId: string
): Promise<{ months: AnalyticsNeedleMonth[]; last5Avg: number; isAnomaly: boolean }> {
  const res = await fetch(`/analytics/needles?organizationId=${encodeURIComponent(organizationId)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to load needle data");
  return body;
}

export function compliancePdfUrl(organizationId: string): string {
  return `/analytics/compliance.pdf?organizationId=${encodeURIComponent(organizationId)}`;
}

export async function fetchAnalyticsGroup(groupId: string): Promise<{
  groupId: string;
  factories: {
    id: string; name: string; location: string | null;
    openTickets: number; inProgressTickets: number; totalTickets: number;
    thisMonthDowntimeHours: number;
    fleet: { total: number; ok: number; due_soon: number; overdue: number; unscheduled: number };
    needleSpendThisMonth: number;
  }[];
}> {
  const res = await fetch(`/analytics/group?groupId=${encodeURIComponent(groupId)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to load group data");
  return body;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export interface AuditItemRow {
  id: string; organizationId: string; category: string; question: string;
  status: "NOT_DONE" | "IN_PROGRESS" | "DONE" | "NA";
  notes: string | null; documentUrl: string | null; autoFilled: boolean; updatedAt: string;
}

export async function fetchAudit(organizationId: string): Promise<{ items: AuditItemRow[]; total: number; done: number; pct: number }> {
  const res = await fetch(`/audit?organizationId=${encodeURIComponent(organizationId)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to load audit");
  return body;
}

export async function updateAuditItem(id: string, patch: { status?: string; notes?: string }): Promise<AuditItemRow> {
  const res = await fetch(`/audit/${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to update item");
  return body;
}

export async function uploadAuditDocument(id: string, file: File): Promise<AuditItemRow> {
  const res = await fetch(`/audit/${encodeURIComponent(id)}/document`, {
    method: "POST", headers: { "Content-Type": file.type }, body: await file.arrayBuffer(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to upload document");
  return body;
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string; name: string; sparePartId: string | null;
  quantity: number; minThreshold: number; unit: string; low: boolean; updatedAt: string;
}

export async function fetchInventory(organizationId: string): Promise<{ items: StockItem[]; lowCount: number }> {
  const res = await fetch(`/inventory?organizationId=${encodeURIComponent(organizationId)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to load inventory");
  return body;
}

export async function addStockItem(payload: { organizationId: string; name: string; quantity?: number; minThreshold?: number; unit?: string }): Promise<StockItem> {
  const res = await fetch("/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to add item");
  return body;
}

export async function updateStockItem(id: string, patch: { name?: string; quantity?: number; minThreshold?: number; unit?: string }): Promise<StockItem> {
  const res = await fetch(`/inventory/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to update item");
  return body;
}

export async function useStockItem(id: string, qty: number): Promise<StockItem> {
  const res = await fetch(`/inventory/${encodeURIComponent(id)}/use`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qty }) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to use item");
  return body;
}

export async function deleteStockItem(id: string): Promise<void> {
  await fetch(`/inventory/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ─── Defects ──────────────────────────────────────────────────────────────────

export interface DefectLogEntry {
  id: string; organizationId: string; serialNumber: string | null; machineName: string | null;
  defectType: string; count: number; shift: string; loggedAt: string;
}

export interface DefectSummary {
  logs: DefectLogEntry[];
  machineSummary: { serialNumber: string; machineName: string; total: number; byType: Record<string, number> }[];
  anomalies: string[];
  totalDefects: number;
}

export async function fetchDefects(organizationId: string, days = 30): Promise<DefectSummary> {
  const res = await fetch(`/defects?organizationId=${encodeURIComponent(organizationId)}&days=${days}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to load defects");
  return body;
}

export async function logDefect(payload: {
  organizationId: string; serialNumber?: string; machineName?: string;
  defectType: string; count: number; shift: string; loggedByUserId?: string;
}): Promise<DefectLogEntry> {
  const res = await fetch("/defects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "Failed to log defect");
  return body;
}
