import type { Env } from '../types';

export const putFile = async (env: Env, key: string, file: File) =>
  env.R2_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream'
    }
  });

export const deleteFile = async (env: Env, key: string) => env.R2_BUCKET.delete(key);

export const getFile = async (env: Env, key: string) => env.R2_BUCKET.get(key);
