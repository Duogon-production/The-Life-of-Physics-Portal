'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/shared/contracts/database.types';
import { getSupabaseConfig } from '@/shared/supabase-config';

/** Lazy initialization keeps the existing UI usable before the auth cutover. */
export function getSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey);
}
