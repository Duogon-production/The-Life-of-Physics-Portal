const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
module.exports=async function run(makeClient,admin) {
 const assessment=randomUUID(),question=randomUUID(),delivery=randomUUID();
 await admin.query("insert into public.assessments(id,course_id,title,type,status) values($1,'30000000-0000-0000-0000-000000000001','Synthetic real-clock expiry','exam','published')",[assessment]);
 await admin.query("insert into public.assessment_questions(id,assessment_id,question_type,prompt,points,position) values($1,$2,'single_choice','Synthetic timed question',2,0)",[question,assessment]);
 await admin.query("insert into public.assessment_options(question_id,text,position,is_correct) values($1,'A',0,true),($1,'B',1,false)",[question]);
 await admin.query("insert into public.offering_assessments(id,offering_id,assessment_id,max_attempts,time_limit_seconds,published) values($1,'60000000-0000-0000-0000-000000000001',$2,2,60,true)",[delivery,assessment]);
 const c=await makeClient();
 try {
  await c.query('set role authenticated');await c.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({iss:'https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1',aud:'authenticated',sub:'10000000-0000-0000-0000-000000000005',role:'authenticated'})]);
  const id=(await c.query('select public.start_assessment_attempt($1) id',[delivery])).rows[0].id;
  const times=(await admin.query('select extract(epoch from deadline_at-started_at) seconds,deadline_at from public.assessment_attempts where id=$1',[id])).rows[0];
  assert.equal(Number(times.seconds),60);
  console.log('Real clock test: waiting for the enforced 60-second duration');
  await new Promise(r=>setTimeout(r,Math.max(0,times.deadline_at.getTime()-Date.now())+100));
  await assert.rejects(c.query('select public.start_assessment_attempt($1)',[delivery]),e=>e.code==='PT409');
  const state=(await c.query('select public.sync_exam_participation($1) s',[delivery])).rows[0].s;
  assert.equal(state.attempts_state,'retry_decision_pending');assert.equal(state.result_released,false);
  await c.query("select public.decide_exam_retry($1,'accept',$2)",[delivery,state.revision]);
  const retry=(await c.query('select public.start_assessment_attempt($1) id',[delivery])).rows[0].id;assert.notEqual(retry,id);
  const retryTimes=(await admin.query('select extract(epoch from deadline_at-started_at) seconds from public.assessment_attempts where id=$1',[retry])).rows[0];assert.equal(Number(retryTimes.seconds),60);
  await c.query('select public.submit_assessment_attempt($1)',[retry]);
  console.log('PASS real clock: duration expiry preserves retry eligibility; second paper gets fresh 60 seconds');
 } finally {await c.end();}
};
