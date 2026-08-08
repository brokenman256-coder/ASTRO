import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  jwtUserSecret: process.env.JWT_USER_SECRET ?? "dev-user-secret",
  jwtAdminSecret: process.env.JWT_ADMIN_SECRET ?? "dev-admin-secret",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  adminAccessPhrase: process.env.ADMIN_ACCESS_PHRASE ?? "",
  seedAdminUsername: process.env.SEED_ADMIN_USERNAME ?? "admin",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "",
  schedulerSecret: process.env.SCHEDULER_SECRET ?? "",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
};

export { required };
