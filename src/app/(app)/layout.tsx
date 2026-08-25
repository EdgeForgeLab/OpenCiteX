import { AppShell } from "@/components/layout/app-shell";
import { ScanProvider } from "@/components/scan/scan-provider";
import { CredentialsProvider } from "@/hooks/use-api-keys";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CredentialsProvider>
      <ScanProvider>
        <AppShell>{children}</AppShell>
      </ScanProvider>
    </CredentialsProvider>
  );
}
