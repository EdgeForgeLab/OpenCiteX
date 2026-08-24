"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RecoveryCodePanel } from "@/components/auth/recovery-code-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function SetupPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      const response = await fetch("/api/auth/status");
      const payload = (await response.json()) as {
        setupComplete?: boolean;
        authenticated?: boolean;
      };
      if (payload.authenticated) {
        router.replace("/dashboard");
        return;
      }
      if (payload.setupComplete) router.replace("/login");
    }
    void boot();
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { recoveryCode?: string; error?: string };
      if (!response.ok || !payload.recoveryCode) {
        throw new Error(payload.error || "Setup failed.");
      }
      setRecoveryCode(payload.recoveryCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Setup failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthFrame
      title="Create admin password"
      description="One password for this OpenCiteX instance. There is no email reset — you will get a recovery code next."
    >
      {recoveryCode ? (
        <RecoveryCodePanel code={recoveryCode} onContinue={() => window.location.assign("/dashboard")} />
      ) : (
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving || password.length < 8}>
            {saving ? "Saving…" : "Create password"}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
