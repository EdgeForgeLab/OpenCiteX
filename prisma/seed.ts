import { PrismaClient } from "@prisma/client";
import { buildDefaultPrompts } from "../src/lib/prompts";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.project.findFirst();
  if (existing) {
    console.log(`Seed skipped: project "${existing.name}" already exists.`);
    return;
  }

  const project = await prisma.project.create({
    data: {
      name: "MetaCitex",
      targetDomain: "metacitex.com",
      brandKeywords: ["MetaCitex", "OpenCiteX", "GEO"],
      competitors: ["Profound", "Goodie AI", "Peec AI"],
    },
  });

  const prompts = buildDefaultPrompts({
    brandName: project.name,
    targetDomain: project.targetDomain,
    competitors: project.competitors,
  });

  await prisma.prompt.createMany({
    data: prompts.map((prompt) => ({
      projectId: project.id,
      text: prompt.text,
      category: prompt.category,
    })),
  });

  console.log(`Seeded project ${project.id} with ${prompts.length} prompts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
