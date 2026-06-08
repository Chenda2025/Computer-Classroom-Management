import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRaw`UPDATE "Kuti" SET "headId" = NULL, "subHeadId" = NULL`;
  console.log('Cleared Kuti headId and subHeadId');
}

main().catch(console.error).finally(() => prisma.$disconnect());
