import "dotenv/config";
import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/auth";
import { env } from "./lib/env";
import { generateAstrologerProfile } from "./services/astrologerBot.service";

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

  const existingAstrologers = await prisma.astrologer.count();
  if (existingAstrologers === 0) {
    // Seed with placeholder avatars, not AI-generated headshots - this runs
    // on every boot, and we don't want to spend on image generation here.
    for (let i = 0; i < 6; i++) {
      const { fallbackPhotoUrl, gender, age, ...profile } = generateAstrologerProfile();
      void gender;
      void age;
      await prisma.astrologer.create({
        data: { ...profile, photoUrl: fallbackPhotoUrl, source: "BOT" },
      });
    }
    console.log("Seeded 6 sample astrologer profiles.");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
