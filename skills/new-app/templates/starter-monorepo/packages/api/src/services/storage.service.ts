import type { Env } from "../bindings.js";

// Single R2 bucket for user artifacts. Store the KEY in D1, never a full URL, and generate URLs
// on demand (here, via the Worker proxy at GET /files/:key — see index.ts). Swap to signed URLs
// if you need private, time-limited access.

export async function uploadFile(
  env: Pick<Env, "FILES">,
  key: string,
  data: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await env.FILES.put(key, data, {
    httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
  });
}

export async function getFile(env: Pick<Env, "FILES">, key: string): Promise<R2ObjectBody | null> {
  return env.FILES.get(key);
}

export function getFileUrl(env: Pick<Env, "APP_URL">, key: string): string {
  return `${env.APP_URL}/files/${key}`;
}
