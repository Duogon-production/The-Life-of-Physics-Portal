// Real independent sessions; called only inside the disposable localhost harness DB.
const assert=require('node:assert/strict');
module.exports=async(makeClient,admin)=>{
 const clients=[];let passed=0;
 async function actor(n){const c=await makeClient();clients.push(c);c.pid=(await c.query('select pg_backend_pid() pid')).rows[0].pid;c.begin=async()=>{await c.query('begin');await c.query("set local lock_timeout='5s'");await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({iss:'https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',sub:'10000000-0000-0000-0000-'+String(n).padStart(12,'0')})]);};return c;}
 async function blocked(c){for(let i=0;i<200;i++){if((await admin.query('select cardinality(pg_blocking_pids($1)) n',[c.pid])).rows[0].n>0)return;await new Promise(r=>setTimeout(r,10));}throw Error('Expected group transaction lock wait');}
 const cmd=async(c,id,a,v,d={})=>(await c.query('select public.group_command($1,$2,$3,$4) value',[id,a,v,d])).rows[0].value;
 const view=(c,id,section='sessions')=>c.query('select public.group_view($1,$2) value',[id,section]);
 async function race(a,b,first,second,expected,label){await a.begin();await b.begin();await first();const pending=second().then(()=>null,e=>e.code);await blocked(b);await a.query('commit');const result=await pending;assert.equal(result,expected,label);await b.query(result?'rollback':'commit');passed++;console.log('PASS group race: '+label);}
 try{
  await admin.query("update public.enrollments set expires_at=null,status='active' where offering_id='60000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000005'");
  await admin.query("insert into public.enrollments(offering_id,user_id,status,enrolled_at) values('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000006','active',now()) on conflict(offering_id,user_id) do update set status='active',expires_at=null");
  const a=await actor(2),b=await actor(2),assistant=await actor(4);
  const student=n=>({userId:'10000000-0000-0000-0000-'+String(n).padStart(12,'0')});
  async function create(capacity=10){await a.begin();const v=await cmd(a,null,'create',null,{offeringId:'60000000-0000-0000-0000-000000000001',name:'Synthetic race group',mode:'online',capacity});await a.query('commit');return v.id;}
  const full=await create(1);
  await race(a,b,()=>cmd(a,full,'add',1,student(5)),()=>cmd(b,full,'add',2,student(6)),'23514','near-capacity additions serialize and preserve one member');
  assert.equal((await admin.query('select count(*)::int n from public.group_memberships where group_id=$1 and ends_at is null',[full])).rows[0].n,1);
  await a.begin();await cmd(a,full,'remove',2,student(5));await a.query('commit');
  const duplicate=await create();
  await race(a,b,()=>cmd(a,duplicate,'add',1,student(5)),()=>cmd(b,duplicate,'add',2,student(5)),null,'duplicate membership retry is idempotent');
  assert.equal((await admin.query('select count(*)::int n from public.group_memberships where group_id=$1 and ends_at is null',[duplicate])).rows[0].n,1);
  const dest1=await create(),dest2=await create();
  await race(a,b,()=>cmd(a,duplicate,'transfer',2,{...student(5),targetGroupId:dest1}),()=>cmd(b,duplicate,'transfer',3,{...student(5),targetGroupId:dest2}),'PT409','competing transfers preserve exactly one active assignment');
  assert.equal((await admin.query("select count(*)::int n from public.group_memberships where offering_id='60000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000005' and ends_at is null")).rows[0].n,1);
  await race(a,b,()=>cmd(a,dest1,'add',2,student(6)),()=>cmd(b,dest2,'add',1,student(6)),'23514','parallel different-group additions cannot duplicate offering membership');
  await a.begin();await cmd(a,dest2,'edit',1,{name:'Scheduled race',mode:'online',schedules:[{weekday:6,time:'16:00',durationMinutes:120}]});await a.query('commit');
  const baseline=(await admin.query('select count(*)::int n from public.group_sessions where group_id=$1',[dest2])).rows[0].n;
  await race(a,b,()=>view(a,dest2),()=>view(b,dest2),null,'simultaneous session generation is unique and idempotent');
  assert.equal((await admin.query('select count(*)::int n from public.group_sessions where group_id=$1',[dest2])).rows[0].n,baseline);
  await a.begin();const dated=await cmd(a,dest1,'one-off',3,{title:'Future',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString()});await a.query('commit');
  await race(a,b,()=>cmd(a,dest1,'session',null,{sessionId:dated.sessionId,sessionVersion:0,operation:'cancel'}),()=>cmd(b,dest1,'session',null,{sessionId:dated.sessionId,sessionVersion:0,operation:'reschedule',startsAt:new Date(Date.now()+172800000).toISOString(),endsAt:new Date(Date.now()+176400000).toISOString()}),'PT409','cancellation racing reschedule rejects stale session write');
  await admin.query('update public.group_memberships set starts_at=now()-interval \'4 days\' where group_id=$1',[dest1]);
  const version=(await admin.query('select version from public.study_groups where id=$1',[dest1])).rows[0].version;
  await a.begin();const past=await cmd(a,dest1,'one-off',version,{title:'Past',startsAt:new Date(Date.now()-172800000).toISOString(),endsAt:new Date(Date.now()-169200000).toISOString()});await view(a,dest1,past.sessionId);await a.query('commit');
  const mark=status=>({sessionId:past.sessionId,sessionVersion:0,marks:[{...student(5),status}]});
  await race(a,b,()=>cmd(a,dest1,'attendance',null,mark('attended')),()=>cmd(b,dest1,'attendance',null,mark('absent')),'PT409','two staff edits cannot lose an attendance update');
  await race(a,b,()=>cmd(a,dest1,'finalize',null,{sessionId:past.sessionId,sessionVersion:1}),()=>cmd(b,dest1,'attendance',null,{...mark('absent'),sessionVersion:1}),'PT409','finalization racing edit rejects stale draft');
  await a.begin();await cmd(a,dest1,'staff',(await admin.query('select version from public.study_groups where id=$1',[dest1])).rows[0].version,{...student(4),remove:false});await a.query('commit');
  // Revocation holds the same group row used by the assistant command. The waiter
  // must recheck privileges after acquiring it, not only before waiting.
  const revokeVersion=(await admin.query('select version from public.study_groups where id=$1',[dest1])).rows[0].version;
  await race(a,assistant,()=>cmd(a,dest1,'staff',revokeVersion,{...student(4),remove:true}),()=>cmd(assistant,dest1,'one-off',revokeVersion+1,{title:'Must not exist',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString()}),'42501','revoked assistant cannot mutate after waiting');
  const learner=await actor(5);
  const oldVersion=(await admin.query('select version from public.study_groups where id=$1',[dest1])).rows[0].version;
  await a.begin();await cmd(a,dest1,'remove',oldVersion,student(6));await a.query('commit');
  const lateGroup=await create();
  await admin.query('begin');await admin.query("select id from public.course_offerings where id='60000000-0000-0000-0000-000000000001' for update");
  await b.begin();const lateAdd=cmd(b,lateGroup,'add',1,student(6));await blocked(b);const cutoff=new Date(Date.now()+50);await new Promise(r=>setTimeout(r,100));await admin.query('commit');await lateAdd;await b.query('commit');
  assert.ok((await admin.query('select starts_at>$2::timestamptz ok from public.group_memberships where group_id=$1 and ends_at is null',[lateGroup,cutoff])).rows[0].ok);
  await a.begin();const ongoing=await cmd(a,lateGroup,'one-off',2,{title:'Historical eligibility boundary',startsAt:cutoff.toISOString(),endsAt:new Date(cutoff.getTime()+3600000).toISOString()});const roster=(await view(a,lateGroup,ongoing.sessionId)).rows[0].value;await a.query('commit');assert.equal(roster.rows.length,0);passed++;console.log('PASS group race: membership effective time after lock wait excludes late joiner from started session');
  await a.begin();await cmd(a,lateGroup,'remove',3,student(6));await a.query('commit');
  const system=await makeClient();clients.push(system);system.pid=(await system.query('select pg_backend_pid() pid')).rows[0].pid;
  await a.begin();await cmd(a,lateGroup,'one-off',4,{title:'Concurrent suspension boundary',startsAt:new Date(Date.now()+86400000).toISOString(),endsAt:new Date(Date.now()+90000000).toISOString()});
  await system.query('begin');const suspend=system.query("update public.enrollments set status='suspended' where offering_id='60000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000006'");await blocked(system);
  await cmd(a,lateGroup,'add',5,student(6));await a.query('commit');await suspend;await system.query('commit');assert.equal((await admin.query('select count(*)::int n from public.group_memberships where group_id=$1 and ends_at is null',[lateGroup])).rows[0].n,0);passed++;console.log('PASS group race: concurrent enrollment suspension serializes without deadlock and ends the new assignment');
  await admin.query("update public.enrollments set expires_at=clock_timestamp()+interval '1 second' where offering_id='60000000-0000-0000-0000-000000000001' and user_id='10000000-0000-0000-0000-000000000005'");
  await admin.query('begin');await admin.query('select id from public.study_groups where id=$1 for update',[dest1]);await learner.begin();
  const expiredRead=view(learner,dest1).then(()=>null,e=>e.code);await blocked(learner);await new Promise(r=>setTimeout(r,1100));await admin.query('commit');assert.equal(await expiredRead,'42501');await learner.query('rollback');passed++;console.log('PASS group race: enrollment expiry during materialization lock wait withholds join details');
  await a.begin();const scheduled=await cmd(a,null,'create',null,{offeringId:'60000000-0000-0000-0000-000000000001',name:'Review schedule race',mode:'online',schedules:[{weekday:2,time:'18:00',durationMinutes:120},{weekday:6,time:'16:00',durationMinutes:120}]});await a.query('commit');
  const sessionDigest=async()=> (await admin.query('select md5(jsonb_agg(to_jsonb(s) order by s.id)::text) digest from public.group_sessions s where group_id=$1',[scheduled.id])).rows[0].digest;
  const originalDigest=await sessionDigest();
  await race(a,b,()=>cmd(a,scheduled.id,'edit',1,{name:'Metadata winner'}),()=>cmd(b,scheduled.id,'edit',1,{schedules:[]}), 'PT409','metadata winning a concurrent schedule clear preserves all sessions');
  assert.equal(await sessionDigest(),originalDigest);
  const retained=(await admin.query('select id from public.group_schedules where group_id=$1 and active and weekday=2',[scheduled.id])).rows[0].id;
  await race(a,b,()=>cmd(a,scheduled.id,'edit',2,{schedules:[{weekday:2,time:'18:00',durationMinutes:120},{weekday:6,time:'16:00',durationMinutes:90}]}),()=>cmd(b,scheduled.id,'edit',2,{description:'Stale metadata'}),'PT409','schedule delta winning a concurrent metadata edit preserves the unchanged slot');
  assert.equal((await admin.query('select active from public.group_schedules where id=$1',[retained])).rows[0].active,true);
  console.log(`All ${passed} independent-session group races passed.`);
 }finally{await admin.query('rollback');for(const c of clients)try{await c.query('rollback');await c.end();}catch{}}
};
