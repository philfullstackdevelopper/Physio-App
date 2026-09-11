// Which storage backend is active. Defaults to "supabase" — the only real
// backend until Outscale OOS credentials exist (see lib/storage/s3.ts's
// header comment). Flip with STORAGE_PROVIDER=s3 once they do.
export type StorageProvider = "supabase" | "s3";

export function activeStorageProvider(): StorageProvider {
  return process.env.STORAGE_PROVIDER === "s3" ? "s3" : "supabase";
}
