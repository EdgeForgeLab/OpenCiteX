"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RecoveryCodePanel } from "@/components/auth/recovery-code-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function RecoverPage() {
  const router = useRouter();
  const [recoveryCode, setRecoveryCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [nextCode, setNextCode] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      const response = await fetch("/api/auth/status");
      const payload = (await response.json()) as { setupComplete?: boolean };
      if (!payload.setupComplete) router.replace("/setup");
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
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ recoveryCode, password }),
      });
      const payload = (await response.json()) as { recoveryCode?: string; error?: string };
      if (!response.ok || !payload.recoveryCode) {
        throw new Error(payload.error || "Reset failed.");
      }
      setNextCode(payload.recoveryCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reset failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthFrame
      title="Reset with recovery code"
      description="The old recovery code is consumed. You will get a new one after the reset. If you lost both, run npm run auth:reset on the server."
    >
      {nextCode ? (
        <RecoveryCodePanel code={nextCode} onContinue={() => window.location.assign("/dashboard")} />
      ) : (
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-2">
            <Label htmlFor="recovery">Recovery code</Label>
            <Input
              id="recovery"
              value={recoveryCode}
              onChange={(event) => setRecoveryCode(event.target.value)}
              className="font-mono"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
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
            <Label htmlFor="confirm">Confirm new password</Label>
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
            {saving ? "Resetting…" : "Reset password"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:text-foreground hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthFrame>
  );
}
