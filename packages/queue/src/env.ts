// Bindings the queue consumer needs. Shares DB/FILES/JOB_QUEUE with the API worker (same names,
// same resources) so the local combined dev server works and re-enqueues stay on one queue.
export interface QueueEnv {
  DB: D1Database;
  FILES: R2Bucket;
  JOB_QUEUE: Queue;
  EMAIL: SendEmail;
  EMAIL_FROM: string;
  APP_URL: string;
  FRONTEND_URL: string;
  ENVIRONMENT: "development" | "staging" | "production";
}
