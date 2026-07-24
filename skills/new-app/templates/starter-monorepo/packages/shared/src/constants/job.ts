import type { JobStep } from "../types/queue.js";

// Max queue delivery attempts before a job is treated as permanently failed, and the backoff
// (seconds) applied between retries. Mirrored by the queue consumer's failure classification.
export const JOB_MAX_ATTEMPTS = 3;
export const JOB_RETRY_BACKOFF_SECONDS = [10, 30, 60] as const;

// Progress checkpoints for the example 3-step job so the UI shows steady forward motion. Each
// handler writes its checkpoint to D1 at the START of the step (see the gotcha in CLAUDE.md:
// update visible status first, so a stuck job shows the real step, not a frozen earlier one).
export const JOB_PROGRESS: Record<JobStep | "done", { progress: number; message: string }> = {
  start: { progress: 10, message: "Starting" },
  process: { progress: 50, message: "Processing" },
  finalize: { progress: 90, message: "Finalizing" },
  done: { progress: 100, message: "Done" },
};
