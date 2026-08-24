import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq);
      if (process.env[key]) continue;
      let value = trimmed.slice(eq + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // DATABASE_URL may already be in the environment.
  }
}

async function main() {
  loadEnv();
  const prisma = new PrismaClient();
  try {
    const result = await prisma.admin.deleteMany();
    if (result.count === 0) {
      console.log("No admin password was set. Open /setup to create one.");
      return;
    }
    console.log("Admin password cleared.");
    console.log("Open /setup in the browser to create a new password and recovery code.");
    console.log("Workspace data and encrypted API keys were not changed.");
  } finally {
    await prisma.$disconnect();
  }
}

void main();
