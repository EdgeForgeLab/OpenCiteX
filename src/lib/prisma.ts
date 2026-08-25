import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function clientMatchesSchema(client: PrismaClient) {
  if (!client.job) return false;
  const models = (
    client as unknown as {
      _runtimeDataModel?: { models?: Record<string, { fields?: { name: string }[] }> };
    }
  )._runtimeDataModel?.models;
  const fields = models?.Job?.fields ?? models?.job?.fields;
  if (!fields) return true;
  return fields.some((field) => field.name === "metrics");
}

function getPrisma() {
  const cached = globalForPrisma.prisma;
  if (cached && clientMatchesSchema(cached)) return cached;
  if (cached) void cached.$disconnect();

  const client = createPrisma();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getPrisma();
