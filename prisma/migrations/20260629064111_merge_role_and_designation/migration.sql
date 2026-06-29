-- Role *is* the designation now: merge the old permission-level `role`,
-- the business-function `departments`, and any "(Designation)" suffix
-- baked into `name` into one multi-valued `roles` column.
ALTER TABLE "InternalAccount" ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "InternalAccount" a
SET "roles" = sub.combined
FROM (
  SELECT
    id,
    ARRAY(
      -- DISTINCT ON case-insensitive value, so "Manager" (from the old
      -- permission role) and a same-named designation don't both show up.
      SELECT DISTINCT ON (upper(e)) e FROM unnest(
        array_append(
          array_cat(
            ARRAY[
              CASE "role"
                WHEN 'ADMIN' THEN 'Admin'
                WHEN 'MANAGER' THEN 'Manager'
                WHEN 'TECHNICIAN' THEN 'Technician'
                ELSE "role"
              END
            ],
            "departments"
          ),
          substring("name" from '\((.*)\)')
        )
      ) AS e
      WHERE e IS NOT NULL AND e <> ''
      -- prefer the nicer Title Case spelling over an ALL-CAPS duplicate
      ORDER BY upper(e), (e = upper(e)) ASC
    ) AS combined
  FROM "InternalAccount"
) AS sub
WHERE a.id = sub.id;

-- The designation is now captured in `roles`, so drop the "(Designation)"
-- suffix that used to be baked into the display name.
UPDATE "InternalAccount"
SET "name" = trim(regexp_replace("name", '\s*\([^)]*\)\s*$', ''))
WHERE "name" ~ '\([^)]*\)$';

ALTER TABLE "InternalAccount" DROP COLUMN "role";
ALTER TABLE "InternalAccount" DROP COLUMN "departments";
