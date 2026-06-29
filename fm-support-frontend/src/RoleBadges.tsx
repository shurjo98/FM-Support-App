const SPECIAL_ROLES = ["ADMIN", "MANAGER", "TECHNICIAN"];

export function RoleBadges({ roles }: { roles: string[] }) {
  if (!roles || roles.length === 0) return null;
  return (
    <>
      {roles.map((role) => {
        const key = role.toUpperCase();
        const variant = SPECIAL_ROLES.includes(key) ? key.toLowerCase() : "custom";
        return (
          <span key={role} className={`int-role-badge int-role-${variant}`}>
            {role}
          </span>
        );
      })}
    </>
  );
}
