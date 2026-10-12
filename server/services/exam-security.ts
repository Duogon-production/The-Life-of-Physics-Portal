import 'server-only';
import { isFirebaseStaging } from '@/shared/auth-config';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import { createExamSecurityRepository } from '@/server/repositories/exam-security';

/** Backend port for later runner wiring. This does not expose new HTTP routes. */
export async function getExamSecurityRepository() {
 if(!isFirebaseStaging() || process.env.LMS_DATA_BACKEND!=='supabase-staging') throw new Error('Secure exams integration is disabled');
 const client=await getSupabaseServerClient();
 const {data,error}=await client.rpc('current_profile_id');
 if(error || !data) throw new Error('Verified Firebase LMS identity required');
 return createExamSecurityRepository(client);
}
