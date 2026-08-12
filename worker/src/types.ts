export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  R2_BUCKET: R2Bucket;
  MAX_UPLOAD_BYTES?: string;
}
