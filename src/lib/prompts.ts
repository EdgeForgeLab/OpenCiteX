import type { PromptCategory } from "@prisma/client";

export function buildDefaultPrompts(input: {
  brandName: string;
  targetDomain: string;
  competitors: string[];
}): { text: string; category: PromptCategory }[] {
  const brand = input.brandName.trim() || "our brand";
  const rivals = input.competitors.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const prompts: { text: string; category: PromptCategory }[] = [
    {
      category: "category",
      text: "Best tools to track brand visibility in ChatGPT, Perplexity, and Gemini",
    },
    {
      category: "category",
      text: "What are the best AI search citation platforms in 2026?",
    },
    {
      category: "category",
      text: "How do marketing teams monitor whether ChatGPT, Perplexity, or Gemini cite their domain?",
    },
    {
      category: "scenario",
      text: "I need to see if AI answer engines mention my company. What should I use?",
    },
    {
      category: "scenario",
      text: "How can a startup get cited by Perplexity, ChatGPT, and Gemini?",
    },
    {
      category: "brand",
      text: `What is ${brand}?`,
    },
    {
      category: "brand",
      text: `What is the official website for ${brand}?`,
    },
  ];

  if (rivals.length >= 2) {
    prompts.push({
      category: "competitor",
      text: `${rivals.slice(0, 3).join(" vs ")}: which is better for AI search visibility tracking?`,
    });
  }
  if (rivals[0]) {
    prompts.push({
      category: "competitor",
      text: `What are the main alternatives to ${rivals[0]} for tracking AI citations?`,
    });
  }

  return prompts;
}
