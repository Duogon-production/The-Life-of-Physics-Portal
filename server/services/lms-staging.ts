import 'server-only';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import { createSupabaseLmsRepository } from '@/server/repositories/lms';
import { isFirebaseStaging } from '@/shared/auth-config';

/** Used by the isolated staging page; legacy routes retain their existing backend. */
export async function getStagingLmsRepository() {
  if (process.env.LMS_DATA_BACKEND !== 'supabase-staging') throw new Error('Supabase LMS integration is disabled');
  const client = await getSupabaseServerClient();
  if (isFirebaseStaging()) {
    const { data: profileId, error } = await client.rpc('current_profile_id');
    if (error || !profileId) throw new Error('Verified Firebase LMS identity required');
    return createSupabaseLmsRepository(client, profileId);
  }
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error('Verified Supabase identity required');
  const { data: profile, error: profileError } = await client.from('profiles').select('id,status').eq('id', user.id).single();
  if (profileError || !profile || profile.status !== 'active') throw new Error('Active LMS profile required');
  return createSupabaseLmsRepository(client, profile.id);
}
