// Native PostgreSQL only, inside the harness's randomized disposable database.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
module.exports=async(makeClient,admin)=>{
 const clients=[];let passed=0;
 async function actor(n,role='authenticated'){const c=await makeClient();clients.push(c);c.pid=(await c.query('select pg_backend_pid() id')).rows[0].id;c.begin=async()=>{await c.query('begin');await c.query("set local lock_timeout='5s'");await c.query('set local role '+role);await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({iss:'https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',sub:'10000000-0000-0000-0000-'+String(n).padStart(12,'0')})]);};return c;}
 async function blocked(c){for(let i=0;i<200;i++){if((await admin.query('select cardinality(pg_blocking_pids($1)) n',[c.pid])).rows[0].n)return;await new Promise(r=>setTimeout(r,10));}throw Error('Expected notification transaction lock wait');}
 const command=async(c,id,action,version,data)=>(await c.query('select public.group_command($1,$2,$3,$4) result',[id,action,version,data])).rows[0].result;
 const member=n=>({userId:'10000000-0000-0000-0000-'+String(n).padStart(12,'0')});
 try{
  const a=await actor(2),b=await actor(2),w1=await actor(1,'service_role'),w2=await actor(1,'service_role'),offering=randomUUID();
  await admin.query("insert into public.course_offerings(id,course_id,name,status,delivery_mode) values($1,'30000000-0000-0000-0000-000000000001','Synthetic notification race','active','scheduled')",[offering]);
  for(const n of [5,6])await admin.query("insert into public.enrollments(offering_id,user_id,status,enrolled_at) values($1,$2,'active',clock_timestamp())",[offering,member(n).userId]);
  await a.begin();const g=(await command(a,null,'create',null,{offeringId:offering,name:'Synthetic notification race',mode:'online',joinUrl:'https://meet.example.com/race',schedules:[{weekday:0,time:'12:00',durationMinutes:60},{weekday:3,time:'12:00',durationMinutes:60}]})).id;await a.query('commit');
  await a.begin();await b.begin();await command(a,g,'add',1,member(5));const joining=command(b,g,'add',2,member(6));await blocked(b);await a.query('commit');await joining;await b.query('commit');
  assert.equal((await admin.query('select count(*)::int n from private.notification_events where resource_id=$1',[g])).rows[0].n,1);
  assert.equal((await admin.query('select count(*)::int n from public.notifications n join private.notification_events e on e.id=n.event_id where e.resource_id=$1',[g])).rows[0].n,2);passed++;
  await a.begin();await b.begin();await a.query("select public.group_view($1,'sessions')",[g]);const materializing=b.query("select public.group_view($1,'sessions')",[g]);await blocked(b);await a.query('commit');await materializing;await b.query('commit');
  assert.equal((await admin.query('select count(*)::int n from private.notification_events where resource_id=$1',[g])).rows[0].n,1);passed++;
  await a.begin();await command(a,g,'remove',3,member(6));await a.query('commit');
  await a.begin();await b.begin();await command(a,g,'edit',4,{joinUrl:'https://meet.example.com/new-race'});const rejoining=command(b,g,'add',5,member(6));await blocked(b);await a.query('commit');await rejoining;await b.query('commit');
  assert.equal((await admin.query('select count(*)::int n from public.notifications n join private.notification_events e on e.id=n.event_id where e.resource_id=$1 and private.notification_current(e.id,n.recipient_id)',[g])).rows[0].n,2);passed++;
  await a.begin();const session=(await command(a,g,'one-off',6,{title:'Synthetic imminent class',startsAt:new Date(Date.now()+5*60000).toISOString(),endsAt:new Date(Date.now()+65*60000).toISOString()})).sessionId;await a.query('commit');
  await w1.begin();await w2.begin();await w1.query("select public.notification_worker('sweep')");const sweeping=w2.query("select public.notification_worker('sweep')");await blocked(w2);await w1.query('commit');await sweeping;await w2.query('commit');
  assert.equal((await admin.query("select count(*)::int n from public.notifications n join private.notification_events e on e.id=n.event_id where e.session_id=$1 and e.event_type='session_starting'",[session])).rows[0].n,2);passed++;
  await admin.query("insert into private.push_subscriptions(user_id,endpoint,p256dh,auth) values($1,$2,$3,$4)",[member(5).userId,'https://fcm.googleapis.com/fcm/send/group-notification-race','a'.repeat(87),'b'.repeat(22)]);
  await admin.query("insert into public.notification_preferences(user_id,event_type,push) values($1,'session_details',true) on conflict(user_id,event_type) do update set push=true,in_app=true",[member(5).userId]);
  // A meaningful reschedule queues a fresh, opted-in job for the current snapshot.
  await a.begin();await command(a,g,'session',7,{sessionId:session,sessionVersion:0,operation:'reschedule',startsAt:new Date(Date.now()+6*60000).toISOString(),endsAt:new Date(Date.now()+66*60000).toISOString()});await a.query('commit');
  const target=(await admin.query("select d.id from private.notification_deliveries d join public.notifications n on n.id=d.notification_id join private.notification_events e on e.id=n.event_id where e.session_id=$1 and e.revoked_at is null and n.recipient_id=$2",[session,member(5).userId])).rows[0].id;
  await w1.begin();const jobs=(await w1.query("select public.notification_worker('claim') jobs")).rows[0].jobs;const claimed=jobs.find(j=>j.id===target);assert.ok(claimed);
  await a.begin();const cancelling=command(a,g,'session',8,{sessionId:session,sessionVersion:1,operation:'cancel',reason:'Synthetic concurrent cancellation'});await blocked(a);await w1.query('commit');await cancelling;await a.query('commit');
  await w2.begin();const checked=(await w2.query("select public.notification_worker('check',$1) result",[{id:target,lease:claimed.lease}])).rows[0].result;assert.equal(checked.valid,false);await w2.query('commit');
  assert.equal((await admin.query('select status from private.notification_deliveries where id=$1',[target])).rows[0].status,'cancelled');passed++;
  assert.equal((await admin.query("select count(*)::int n from public.notifications n join private.notification_events e on e.id=n.event_id where e.session_id=$1 and private.notification_current(e.id,n.recipient_id)",[session])).rows[0].n,0);passed++;
  const trusted1=await actor(1,'postgres'),trusted2=await actor(1,'postgres'),key='synthetic-recipient-race:'+randomUUID();
  const emit=(c,n)=>c.query("select private.emit_notification($1,'account_approved','20000000-0000-0000-0000-000000000001',$2,$3)",[key,g,[member(n).userId]]);
  await trusted1.begin();await trusted2.begin();await emit(trusted1,5);const extending=emit(trusted2,6);await blocked(trusted2);await trusted1.query('commit');await extending;await trusted2.query('commit');
  assert.equal((await admin.query('select count(*)::int n from public.notifications n join private.notification_events e on e.id=n.event_id where e.event_key=$1',[key])).rows[0].n,2);passed++;
  console.log(`PASS group notification concurrency: ${passed} cases`);
 }finally{for(const c of clients){await c.query('rollback').catch(()=>{});await c.end();}}
};
