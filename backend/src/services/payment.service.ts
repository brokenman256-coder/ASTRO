import { prisma } from "../lib/prisma";

export async function getPaymentSettings() {
  return prisma.paymentSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export function minSessionCostPaise(priceRupeesPerMinute: number, minSessionMinutes: number): number {
  return priceRupeesPerMinute * minSessionMinutes * 100;
}
