import type { PromptCategory } from "@prisma/client";
import { probeLanguage, type ProbeLanguage } from "@/lib/types";

type PromptTemplates = {
  brandHow: (brand: string) => string;
  brandSite: (brand: string) => string;
  categoryTools: (category: string) => string;
  categoryBest: (category: string) => string;
  categoryWhich: (category: string) => string;
  competitorAlts: (rival: string) => string;
  competitorBetter: (rival: string, category: string) => string;
  scenarioHow: (description: string) => string;
  scenarioBest: (description: string) => string;
  scenarioChoose: (category: string) => string;
};

const TEMPLATES: Record<ProbeLanguage, PromptTemplates> = {
  en: {
    brandHow: (brand) => `How is ${brand}?`,
    brandSite: (brand) => `What is the official website for ${brand}?`,
    categoryTools: (category) => `What are some good ${category} tools?`,
    categoryBest: (category) => `Best ${category} platforms?`,
    categoryWhich: (category) => `Which ${category} should I use?`,
    competitorAlts: (rival) => `What are alternatives to ${rival}?`,
    competitorBetter: (rival, category) => `Who is better than ${rival} for ${category}?`,
    scenarioHow: (description) => `How do I ${description}?`,
    scenarioBest: (description) => `What's the best way to ${description}?`,
    scenarioChoose: (category) => `How do I choose the right ${category}?`,
  },
  zh: {
    brandHow: (brand) => `${brand}怎么样？`,
    brandSite: (brand) => `${brand}官网是什么？`,
    categoryTools: (category) => `有哪些好用的${category}工具？`,
    categoryBest: (category) => `2026年最好的${category}平台有哪些？`,
    categoryWhich: (category) => `应该选哪家${category}？`,
    competitorAlts: (rival) => `${rival}的替代方案有哪些？`,
    competitorBetter: (rival, category) => `在${category}里，谁比${rival}更好？`,
    scenarioHow: (description) => `如何解决${description}？`,
    scenarioBest: (description) => `${description}应该用什么方案？`,
    scenarioChoose: (category) => `如何选择适合的${category}？`,
  },
  fr: {
    brandHow: (brand) => `Comment est ${brand} ?`,
    brandSite: (brand) => `Quel est le site officiel de ${brand} ?`,
    categoryTools: (category) => `Quels sont de bons outils ${category} ?`,
    categoryBest: (category) => `Meilleures plateformes ${category} ?`,
    categoryWhich: (category) => `Quelle ${category} devrais-je utiliser ?`,
    competitorAlts: (rival) => `Quelles sont les alternatives à ${rival} ?`,
    competitorBetter: (rival, category) => `Qui est meilleur que ${rival} pour ${category} ?`,
    scenarioHow: (description) => `Comment puis-je ${description} ?`,
    scenarioBest: (description) => `Quelle est la meilleure façon de ${description} ?`,
    scenarioChoose: (category) => `Comment choisir la bonne ${category} ?`,
  },
  es: {
    brandHow: (brand) => `¿Cómo es ${brand}?`,
    brandSite: (brand) => `¿Cuál es el sitio oficial de ${brand}?`,
    categoryTools: (category) => `¿Cuáles son buenas herramientas de ${category}?`,
    categoryBest: (category) => `¿Mejores plataformas de ${category}?`,
    categoryWhich: (category) => `¿Qué ${category} debería usar?`,
    competitorAlts: (rival) => `¿Cuáles son las alternativas a ${rival}?`,
    competitorBetter: (rival, category) => `¿Quién es mejor que ${rival} para ${category}?`,
    scenarioHow: (description) => `¿Cómo hago ${description}?`,
    scenarioBest: (description) => `¿Cuál es la mejor forma de ${description}?`,
    scenarioChoose: (category) => `¿Cómo elijo el ${category} adecuado?`,
  },
};

export function buildDefaultPrompts(input: {
  name: string;
  industryCategory?: string | null;
  description?: string | null;
  competitors: string[];
  language?: string | null;
}): { text: string; category: PromptCategory }[] {
  const brand = input.name.trim() || "our brand";
  const category = input.industryCategory?.trim() ?? "";
  const description = input.description?.trim().replace(/\?+$/, "") ?? "";
  const rivals = input.competitors.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const t = TEMPLATES[probeLanguage(input.language)];
  const prompts: { text: string; category: PromptCategory }[] = [
    { category: "brand", text: t.brandHow(brand) },
    { category: "brand", text: t.brandSite(brand) },
  ];

  if (category) {
    prompts.push(
      { category: "category", text: t.categoryTools(category) },
      { category: "category", text: t.categoryBest(category) },
      { category: "category", text: t.categoryWhich(category) },
    );
  }
  for (const rival of rivals) {
    prompts.push({ category: "competitor", text: t.competitorAlts(rival) });
    if (category) {
      prompts.push({
        category: "competitor",
        text: t.competitorBetter(rival, category),
      });
    }
  }
  if (description) {
    prompts.push(
      { category: "scenario", text: t.scenarioHow(description) },
      { category: "scenario", text: t.scenarioBest(description) },
    );
  } else if (category) {
    prompts.push({ category: "scenario", text: t.scenarioChoose(category) });
  }

  const seen = new Set<string>();
  return prompts.filter((prompt) => {
    const key = prompt.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
