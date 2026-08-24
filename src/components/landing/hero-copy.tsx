"use client";

import { PrintText } from "@/components/ui/print-text";

export function HeroCopy() {
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
        <PrintText text="Open-source GEO radar" speed={22} />
      </p>
      <h1 className="mt-3 font-sans text-4xl font-semibold leading-[1.08] tracking-tight md:text-5xl">
        <PrintText
          text="See if answer engines actually cite you."
          speed={26}
          delay={350}
          reserveSpace
        />
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        <PrintText
          text="OpenCiteX probes Perplexity, GPT-4o, and Gemini with your own keys, then scores mention, citation, and competitor intercept — so you know where generative search erases your brand."
          speed={8}
          delay={1700}
          caret={false}
          reserveSpace
        />
      </p>
    </>
  );
}
