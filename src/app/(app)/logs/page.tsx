import { redirect } from "next/navigation";

export default function LogsRedirect({
  searchParams,
}: {
  searchParams: { jobId?: string; scanId?: string };
}) {
  const id = searchParams.scanId ?? searchParams.jobId;
  redirect(id ? `/results?scanId=${encodeURIComponent(id)}` : "/results");
}
