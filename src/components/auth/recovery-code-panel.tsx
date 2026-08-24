"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecoveryCodePanel({
  code,
  onContinue,
}: {
  code: string;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Save this recovery code somewhere offline. It is the only way to reset your password from
        the UI. You will not see it again.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3">
        <code className="font-mono text-sm tracking-wide text-foreground">{code}</code>
        <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Button className="w-full" onClick={onContinue}>
        I saved this code
      </Button>
    </div>
  );
}
