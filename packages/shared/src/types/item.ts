// `Item` is the example domain object — the one thing a user creates that then runs through the
// async job pipeline. Rename it to your real core object (Report, Track, Render, ...) and add the
// fields your domain needs. The status/progress shape is what the dashboard + queue rely on.
export type ItemStatus = "pending" | "processing" | "done" | "failed";

export interface Item {
  id: string;
  userId: string;
  orgId: string | null;
  title: string;
  status: ItemStatus;
  progress: number;
  progressMessage: string | null;
  // R2 key of the produced artifact (store the key, never a full URL — see CLAUDE.md).
  resultKey: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
