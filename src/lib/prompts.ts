import type { PromptCategory } from "@prisma/client";

export function buildDefaultPrompts(input: {
  brandName: string;
  targetDomain: string;
  competitors: string[];
}): { text: string; category: PromptCategory }[] {
  const brand = input.brandName.trim() || "our brand";
  const domain = input.targetDomain.trim() || "example.com";
  const prompts: { text: string; category: PromptCategory }[] = [
    { category: "brand", text: `What is ${brand}?` },
    {
      category: "brand",
      text: `Is ${brand} (${domain}) a reputable product, and who is it for?`,
    },
    {
      category: "category",
      text: "What are the best generative engine optimization (GEO) platforms in 2026?",
    },
    {
      category: "category",
      text: "Best tools to track AI search citations and brand visibility in ChatGPT, Perplexity, and Gemini",
    },
    {
      category: "scenario",
      text: `How can ${domain} get cited by AI answer engines like Perplexity, ChatGPT, and Gemini?`,
    },
    {
      category: "scenario",
      text: `I want ${brand} to appear when people ask AI for recommendations in our category. What should I do?`,
    },
  ];

  for (const competitor of input.competitors.slice(0, 3)) {
    const name = competitor.trim();
    if (!name) continue;
    prompts.push({
      category: "competitor",
      text: `${brand} vs ${name}: which is better for AI search / GEO visibility, and why?`,
    });
  }

  return prompts;
}
