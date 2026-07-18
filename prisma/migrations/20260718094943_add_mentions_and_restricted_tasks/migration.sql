-- AlterTable
ALTER TABLE "InternalNotification" ADD COLUMN     "isMention" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "InternalTask" ADD COLUMN     "allowedAccountIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "restricted" BOOLEAN NOT NULL DEFAULT false;
