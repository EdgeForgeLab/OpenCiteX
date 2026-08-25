const lastFinishedAt = new Map<string, number>();

export async function waitProviderGap(id: string, paceMs: number) {
  const last = lastFinishedAt.get(id) ?? 0;
  const delay = last + Math.max(0, paceMs) - Date.now();
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export function markProviderFinished(id: string) {
  lastFinishedAt.set(id, Date.now());
}