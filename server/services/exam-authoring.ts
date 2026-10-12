import 'server-only';
import { randomUUID } from 'node:crypto';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import { authorEditable,authorSave } from '@/shared/contracts/exam-authoring';
import { examFailure } from '@/server/services/exam-runner';

/** Read-only capability probe. A denied nonexistent paper confirms the RPC exists. */
export async function examAuthoringAvailable() {
 const client=await getSupabaseServerClient();
 const {error}=await client.rpc('get_exam_definition',{p_schedule_id:randomUUID()});
 if(error?.code==='PGRST202')return false;
 if(error?.code==='42501')return true;
 throw examFailure('Unable to verify exam authoring availability',503);
}
export async function examAuthoringService() {
 const client=await getSupabaseServerClient();
 return {
  load:async(id:string)=>{let result=await client.rpc('get_exam_definition_v2',{p_schedule_id:id});if(result.error?.code==='PGRST202')result=await client.rpc('get_exam_definition',{p_schedule_id:id});const {data,error}=result;if(error)throw examFailure('Exam editing unavailable',error.code==='PT409'?409:error.code==='42501'?403:503);return authorEditable.parse(data);},
  save:async(input:unknown)=>{const v=authorSave.parse(input);const args={p_offering_id:v.offeringId,p_schedule_id:v.scheduleId,p_expected_updated_at:v.updatedAt,p_definition:v.definition};let result=await client.rpc('save_exam_definition_v2',args);if(result.error?.code==='PGRST202'){
   if(v.definition.kind==='quiz')throw examFailure('Quiz authoring awaits its development database update.',503);
   if(v.definition.questions.some(q=>q.questionType&&!['single_choice','essay','file_upload'].includes(q.questionType)))throw examFailure('Extended exam authoring awaits its development database update.',503);
   const {kind:_kind,...base}=v.definition;
   const compatible={...base,questions:v.definition.questions.map(({questionType: _format,correctChoices: _keys,numericValue: _value,numericTolerance: _tolerance,...q})=>q)};
   result=await client.rpc('save_exam_definition',{...args,p_definition:compatible});
  }const {data,error}=result;if(error||!data)throw examFailure(error?.code==='PT409'?'Exam changed, is locked, or is shared. Reload or create a new paper.':'Exam could not be saved',error?.code==='PT409'?409:error?.code==='42501'?403:400);return {id:data};},
  clone:async(id:string)=>{const {data,error}=await client.rpc('clone_exam_schedule',{p_schedule_id:id});if(error||!data)throw examFailure('Cloning is unavailable. The development database update may be pending.',error?.code==='42501'?403:503);return {id:data};},
 };
}
