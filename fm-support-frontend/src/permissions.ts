// Role *is* the designation — one person can hold several (e.g.
// "Technician" + "Marketing"), picked from a curated list or typed in
// manually. "Admin"/"Manager" among them (case-insensitive, since custom
// entries are free text) grant the matching permission level.
export function hasRole(account: { roles: string[] }, role: string): boolean {
  return account.roles.some((r) => r.toUpperCase() === role.toUpperCase());
}

export function canManageTasks(account: { roles: string[] }): boolean {
  return hasRole(account, "MANAGER") || hasRole(account, "ADMIN");
}

export function isFmAdmin(account: { roles: string[] }): boolean {
  return hasRole(account, "ADMIN");
}
