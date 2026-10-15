import 'server-only';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import type { Json } from '@/shared/contracts/database.types';
export const communicationFailure=(message:string,status=400)=>Object.assign(new Error(message),{status});
export async function communicationService(){
 const client=await getSupabaseServerClient();
 return async(domain:'notifications'|'support',action:string,data:Json,id:string|null=null,version:number|null=null,requestId:string|null=null)=>{
  const result=domain==='notifications'?await client.rpc('notification_command',{p_action:action,p_data:data}):await client.rpc('support_command',{p_action:action,p_ticket:id,p_version:version,p_request:requestId,p_data:data});
  if(result.error||result.data===null){const code=result.error?.code,status=code==='42501'?403:code==='PT409'?409:code==='PT429'?429:['23514','23502','23505','22P02','22003'].includes(code??'')?400:503;
   throw communicationFailure(status===403?'Record unavailable or permission denied.':status===409?'This ticket changed. Refresh before sending again.':status===429?'Too many requests. Please try again later.':status===400?'Check the entered details.':'Notifications and support are temporarily unavailable or require the approved database update.',status);
  }return result.data;
 };
}
