'use client';

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { getFirebaseAuth, restoreFirebaseAuth } from '@/frontend/lib/firebase';
import { isFirebaseStaging } from '@/shared/auth-config';
import type { Database } from '@/shared/contracts/database.types';
import { getSupabaseConfig } from '@/shared/supabase-config';

/** Lazy initialization keeps the existing UI usable before the auth cutover. */
export function getSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseConfig();
  if (isFirebaseStaging()) return createClient<Database>(url, publishableKey, {
    accessToken: async () => {
      await restoreFirebaseAuth();
      return await getFirebaseAuth().currentUser?.getIdToken() ?? null;
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return createBrowserClient<Database>(url, publishableKey);
}
