// One-off, idempotent backfill: tags each InternalAccount with the internal
// sub-team(s) it belongs to (Software / Hardware) as an addition to its
// existing `roles`. Safe to re-run — only adds a tag if not already present.
// Run once via: npx ts-node --transpile-only scripts/backfill-team-roles.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.internalAccount.findMany();

  for (const account of accounts) {
    const rolesToAdd: string[] = [];

    if (account.name === "Lucy") {
      if (!account.roles.includes("Software Team")) rolesToAdd.push("Software Team");
    } else if (account.name === "Mehrab") {
      if (!account.roles.includes("Software Team")) rolesToAdd.push("Software Team");
      if (!account.roles.includes("Hardware Team")) rolesToAdd.push("Hardware Team");
    } else {
      if (!account.roles.includes("Hardware Team")) rolesToAdd.push("Hardware Team");
    }

    if (rolesToAdd.length === 0) continue;

    await prisma.internalAccount.update({
      where: { id: account.id },
      data: { roles: [...account.roles, ...rolesToAdd] },
    });
    console.log(`${account.name}: added ${rolesToAdd.join(", ")}`);
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
