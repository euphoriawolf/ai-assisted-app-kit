// The example job is a generic multi-step pipeline. Replace `JobStep` with the real steps of your
// domain's async work (e.g. "identify" -> "generate" -> "finalize"); keep the message shape
// (step + entity id + user + attempt) so the consumer's routing/retry logic still applies.
export type JobStep = "start" | "process" | "finalize";

export type JobMessage = {
  step: JobStep;
  itemId: string;
  userId: string;
  // Carried across retries so the consumer can classify a permanent failure at max attempts.
  attempt?: number;
};
