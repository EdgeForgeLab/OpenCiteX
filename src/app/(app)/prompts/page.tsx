import { Suspense } from "react";
import { PromptsClient } from "./prompts-client";

export default function PromptsPage() {
  return (
    <Suspense>
      <PromptsClient />
    </Suspense>
  );
}