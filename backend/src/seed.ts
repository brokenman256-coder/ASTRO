import "dotenv/config";
import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/auth";
import { env } from "./lib/env";
import { ASTROLOGER_PERSONAS } from "./seedAstrologers";

async function main() {
  if (!env.seedAdminPassword) {
    throw new Error("Set SEED_ADMIN_PASSWORD in backend/.env before seeding.");
  }

  const passwordHash = await hashPassword(env.seedAdminPassword);
  await prisma.admin.upsert({
    where: { username: env.seedAdminUsername },
    update: {},
    create: { username: env.seedAdminUsername, passwordHash },
  });
  console.log(`Seeded admin account "${env.seedAdminUsername}".`);

  await prisma.brandingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  await prisma.botSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  await prisma.astrologerBotSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  await prisma.adminAISettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  for (const persona of ASTROLOGER_PERSONAS) {
    const existing = await prisma.astrologer.findFirst({ where: { name: persona.name } });
    if (existing) continue;
    await prisma.astrologer.create({ data: { ...persona, source: "MANUAL" } });
  }
  console.log(`Ensured ${ASTROLOGER_PERSONAS.length} named astrologer personas exist.`);

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
