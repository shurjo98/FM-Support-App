-- Add skills to InternalAccount
ALTER TABLE "InternalAccount" ADD COLUMN "skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Multi-assignee tasks: TaskAssignment (LEAD/ASSIST roles)
CREATE TABLE "TaskAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskAssignment_taskId_accountId_key" ON "TaskAssignment"("taskId", "accountId");

ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "InternalTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InternalAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing single assigneeId becomes that task's LEAD
INSERT INTO "TaskAssignment" ("id", "taskId", "accountId", "role")
SELECT 'ta-backfill-' || "id", "id", "assigneeId", 'LEAD'
FROM "InternalTask"
WHERE "assigneeId" IS NOT NULL;

-- The single-assignee column is now fully replaced by TaskAssignment
ALTER TABLE "InternalTask" DROP COLUMN "assigneeId";
