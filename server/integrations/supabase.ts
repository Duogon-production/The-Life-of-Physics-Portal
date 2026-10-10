import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { isFirebaseStaging } from '@/shared/auth-config';
import { getFirebaseSession } from '@/server/services/firebase-auth';
import { cookies } from 'next/headers';
import type { Database } from '@/shared/contracts/database.types';
import { getSupabaseConfig } from '@/shared/supabase-config';

/** Request-scoped client: uses the caller's Supabase session and respects RLS. */
export async function getSupabaseServerClient() {
  if (isFirebaseStaging()) {
    const session = await getFirebaseSession();
    if (!session || session.identity.role !== 'authenticated' || !session.identity.email_verified) throw new Error('Verified Firebase identity required');
    const { url, publishableKey } = getSupabaseConfig();
    return createClient<Database>(url, publishableKey, { accessToken: async () => session.token,
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseConfig();
  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
