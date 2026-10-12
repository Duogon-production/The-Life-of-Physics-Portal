import 'server-only';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import { getWebsiteContext,offeringCapability } from '@/server/services/website';
import { createExamsRepository } from '@/server/repositories/exams';
import { createExamSecurityRepository } from '@/server/repositories/exam-security';
import { examFailure } from '@/server/services/exam-runner';
import { z } from 'zod';
import type { GradingPayload,GradingEntry } from '@/shared/contracts/exams';

export async function examGradingService(scheduleId:string) {
 const context=await getWebsiteContext();if(!context)throw examFailure('Sign in required',401);
 const client=await getSupabaseServerClient(),repo=createExamSecurityRepository(client);
 const exam=await createExamsRepository(client,context.viewer.id).get(scheduleId,{studentView:false});
 if(!exam)throw examFailure('Exam unavailable',404);
 const courses=await context.repository.courses(),offerings=await context.repository.offerings(courses.map(c=>c.id));
 const offering=offerings.find(o=>o.id===exam.offeringId),course=courses.find(c=>c.id===offering?.course_id);
 if(!course||!offeringCapability(context,course,exam.offeringId))throw examFailure('Grading not permitted',403);
 async function checked<T>(query:PromiseLike<{data:T|null;error:{code?:string}|null}>) {
  const {data,error}=await query;if(error)throw examFailure('Grading operation not permitted',error.code==='PT409'?409:error.code==='42501'?403:400);return data;
 }
 const loadedQuestions=await checked(client.from('assessment_questions').select('id,position,prompt,points,question_type').eq('assessment_id',exam.assessmentId).order('position').limit(101));
 if(!loadedQuestions||loadedQuestions.length>100)throw examFailure('Exam question limit exceeded',409);
 const questions=loadedQuestions;
 const written=questions.filter(q=>['essay','short_text','file_upload'].includes(q.question_type));
 async function attempt(id:string) {
  const row=await checked<{id:string;user_id:string}>(client.from('assessment_attempts').select('id,user_id').eq('id',id).eq('offering_assessment_id',scheduleId).single());
  if(!row)throw examFailure('Submission unavailable',404);
  const detail=await repo.gradingDetail(id);
  if(detail.state.attempts_state!=='finalized'||detail.state.current_attempt?.id!==id)throw examFailure('Student attempts are not finalized',409);
  return {row,detail};
 }
 async function load(after:string|null=null):Promise<GradingPayload> {
  const page=await client.rpc('get_exam_submission_page',{p_schedule_id:scheduleId,p_after:after,p_limit:25});
  let rows:{id:string;user_id:string}[],nextCursor:string|null=null;
  if(page.error?.code==='PGRST202'){
   let query=client.from('assessment_attempts').select('id,user_id').eq('offering_assessment_id',scheduleId).in('status',['submitted','graded']).order('id').limit(26);if(after)query=query.gt('id',after);
   const found=await checked(query);if(!found)throw examFailure('Submission list unavailable',503);nextCursor=found.length>25?found[24].id:null;rows=found.slice(0,25);
  }else{if(page.error)throw examFailure('Submission list unavailable',page.error.code==='42501'?403:503);const p=z.object({ids:z.array(z.string().uuid()).max(25),nextCursor:z.string().uuid().nullable()}).parse(page.data);nextCursor=p.nextCursor;rows=p.ids.length?(await checked(client.from('assessment_attempts').select('id,user_id').in('id',p.ids).eq('offering_assessment_id',scheduleId).order('id')))??[]:[];if(rows.length!==p.ids.length)throw examFailure('Incomplete submission page',503);}
  const entries:GradingEntry[]=[];
  for(const row of rows){const d=await repo.gradingDetail(row.id);if(d.state.attempts_state!=='finalized'||d.state.current_attempt?.id!==row.id)continue;
   const profile=await checked<{display_name:string|null}>(client.from('profiles').select('display_name').eq('id',row.user_id).single());
   const answers:GradingEntry['answers']={},scores:Record<string,number>={},allScores:Record<string,number>={};let writtenScore=0,mcqScore=0,mcqTotal=0;
   for(const q of questions){const outcome=d.questions.find(v=>v.question_id===q.id);if(!outcome)throw examFailure('Incomplete submission',409);
    if(outcome.awarded_points!==null)allScores[q.id]=outcome.awarded_points;
    if(written.some(v=>v.id===q.id)){
     if(outcome.awarded_points!==null){scores[q.id]=outcome.awarded_points;writtenScore+=outcome.awarded_points;}
     let imageUrl:string|null=null;
     if(outcome.media_asset_id){const m=await checked<{bucket:string;object_path:string}>(client.from('media_assets').select('bucket,object_path').eq('id',outcome.media_asset_id).single());if(!m)throw examFailure('Photo unavailable',403);const signed=await client.storage.from(m.bucket).createSignedUrl(m.object_path,600);if(signed.error)throw examFailure('Photo unavailable',403);imageUrl=signed.data?.signedUrl??null;}
     answers[q.id]={text:typeof outcome.response?.text==='string'?outcome.response.text:null,imageUrl};
    }else{mcqTotal+=q.points;mcqScore+=outcome.awarded_points??0;answers[q.id]={text:outcome.response?JSON.stringify(outcome.response):null};}
   }
   const history=await client.rpc('get_exam_grade_changes',{p_attempt_id:row.id});if(history.error&&history.error.code!=='PGRST202')throw examFailure('Grading history unavailable',503);
   const gradeChanges=history.error?[]:z.array(z.object({id:z.string().uuid(),changedAt:z.string(),reason:z.string(),previousScore:z.number().nullable(),score:z.number().nullable(),staffId:z.string().nullable()})).parse(history.data);
   const feedback=d.result.responses.find(r=>r.feedback)?.feedback??null;
   entries.push({allScores,gradeChanges,sessionId:row.id,userId:row.user_id,revision:d.state.revision,resultReleased:d.state.result_released,reviewReleased:d.state.review_released,studentName:profile?.display_name||row.user_id,studentEmail:'',writtenStatus:d.state.grading_state==='pending'?'UNDER_CORRECTION':'GRADED',writtenScore:d.state.grading_state==='complete'?writtenScore:null,writtenScores:scores,reviewNote:feedback,finalizedAt:null,mcqScore,mcqTotal,answers});
  }
  return {nextCursor,allQuestions:questions.map(q=>({id:q.id,position:q.position+1,text:q.prompt,imageUrl:null,points:q.points})),exam:{id:scheduleId,title:exam!.title},writtenQuestions:written.map(q=>({id:q.id,position:q.position+1,text:q.prompt,imageUrl:null,points:q.points})),entries};
 }
 return {load,
  grade:async(id:string,revision:number,scores:Record<string,number>,feedback:string,reason:string|null,requestId:string)=>{
   // PostgreSQL validates scope, revision, the entire marks set and audit insertion atomically.
   await attempt(id);
   await checked(client.rpc('grade_exam_paper',{p_attempt_id:id,p_expected_revision:revision,p_scores:scores,p_feedback:feedback,p_reason:reason,p_request_id:requestId}));return load();
  },
  release:async(id:string,revision:number,review:boolean)=>{const {row}=await attempt(id);await (review?repo.releaseReview(scheduleId,row.user_id,revision):repo.release(scheduleId,row.user_id,revision));return load();},
 };
}
