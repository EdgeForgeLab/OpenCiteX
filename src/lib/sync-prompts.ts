import { prisma } from "@/lib/prisma";
import { buildDefaultPrompts } from "@/lib/prompts";

export async function syncBrandPrompts(brand: {
  id: string;
  name: string;
  industryCategory: string | null;
  description: string | null;
  competitors: string[];
  language: string;
}) {
  const next = buildDefaultPrompts({
    name: brand.name,
    industryCategory: brand.industryCategory,
    description: brand.description,
    competitors: brand.competitors,
    language: brand.language,
  });
  const existing = await prisma.prompt.findMany({
    where: { brandId: brand.id },
    select: { text: true },
  });
  const serialize = (texts: string[]) => [...texts].sort().join("\0");
  if (serialize(next.map((item) => item.text)) === serialize(existing.map((item) => item.text))) {
    return { replaced: false, count: next.length };
  }

  await prisma.prompt.deleteMany({ where: { brandId: brand.id } });
  if (next.length > 0) {
    await prisma.prompt.createMany({
      data: next.map((prompt) => ({
        brandId: brand.id,
        text: prompt.text,
        category: prompt.category,
      })),
    });
  }
  return { replaced: true, count: next.length };
}
