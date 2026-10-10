import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/contracts/database.types';
import type { LmsMediaStorage } from '@/shared/contracts/lms';

/** Register metadata, upload once, then complete via RPC. No public URLs. */
export function createSupabaseMediaStorage(client: SupabaseClient<Database>): LmsMediaStorage {
  return {
    async upload(bucket, path, file) {
      const limit = bucket === 'lms-course-media' ? 50_000_000 : 20 * 1024 * 1024;
      if (file.size > limit) throw new Error('File exceeds bucket limit');
      const { error } = await client.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw new Error('Private file upload failed');
    },
    async download(bucket, path) {
      const { data, error } = await client.storage.from(bucket).download(path);
      if (error || !data) throw new Error('Private file unavailable');
      return data;
    },
  };
}
