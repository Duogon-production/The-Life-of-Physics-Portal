import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/shared/contracts/database.types';
import { examStateSchema, examContentSchema, examReviewSchema, examGradingSchema } from '@/shared/contracts/exam-security';

/** Request-scoped caller JWT only. No service key; all runner transitions are database-authorized. */
export function createExamSecurityRepository(client: SupabaseClient<Database>) {
 async function payload(query: PromiseLike<{data:Json|null;error:{code?:string}|null}>) {
  const {data,error}=await query;
  if(error) throw Object.assign(new Error('Exam operation failed'),{status:error.code==='PT409'?409: error.code==='42501'?403:400});
  return data;
 }
 async function state(query: PromiseLike<{data:Json|null;error:{code?:string}|null}>) { return examStateSchema.parse(await payload(query)); }
 return {
  sync:(scheduleId:string)=>state(client.rpc('sync_exam_participation',{p_schedule_id:scheduleId})),
  decide:(scheduleId:string,decision:'accept'|'decline',revision:number)=>state(client.rpc('decide_exam_retry',{p_schedule_id:scheduleId,p_decision:decision,p_expected_revision:revision})),
  save:(attemptId:string,questionId:string,response:Json|null,mediaAssetId:string|null,revision:number)=>state(client.rpc('save_exam_response',{p_attempt_id:attemptId,p_question_id:questionId,p_response:response,p_media_asset_id:mediaAssetId,p_expected_revision:revision})),
  release:(scheduleId:string,userId:string,revision:number)=>state(client.rpc('release_exam_result',{p_schedule_id:scheduleId,p_user_id:userId,p_expected_revision:revision})),
  releaseReview:(scheduleId:string,userId:string,revision:number)=>state(client.rpc('release_exam_review',{p_schedule_id:scheduleId,p_user_id:userId,p_expected_revision:revision})),
  content:async(attemptId:string)=>examContentSchema.parse(await payload(client.rpc('get_exam_attempt_content',{p_attempt_id:attemptId}))),
  review:async(scheduleId:string)=>examReviewSchema.parse(await payload(client.rpc('get_exam_review',{p_schedule_id:scheduleId}))),
  gradingDetail:async(attemptId:string)=>examGradingSchema.parse(await payload(client.rpc('get_exam_grading_detail',{p_attempt_id:attemptId}))),
 };
}
