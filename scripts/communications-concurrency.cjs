// Independent PostgreSQL sessions, only in the randomized disposable harness database.
const assert=require('node:assert/strict');
module.exports=async(makeClient,admin)=>{
 const clients=[];let passed=0;
 async function actor(n,role='authenticated'){const c=await makeClient();clients.push(c);c.pid=(await c.query('select pg_backend_pid() id')).rows[0].id;c.begin=async()=>{await c.query('begin');await c.query("set local lock_timeout='5s'");await c.query('set local role '+role);await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({iss:'https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',sub:'10000000-0000-0000-0000-'+String(n).padStart(12,'0')})]);};return c;}
 async function blocked(c){for(let i=0;i<200;i++){if((await admin.query('select cardinality(pg_blocking_pids($1)) n',[c.pid])).rows[0].n)return;await new Promise(r=>setTimeout(r,10));}throw Error('Expected communication lock wait');}
 const cmd=async(c,action,id,version,request,data)=> (await c.query('select public.support_command($1,$2,$3,$4,$5) value',[action,id,version,request,data])).rows[0].value;
 const uid='10000000-0000-0000-0000-000000000005',org='20000000-0000-0000-0000-000000000001';
 const uuid=()=>require('node:crypto').randomUUID();
 try{
  const a=await actor(5),b=await actor(5),staff=await actor(1);
  const payload={organizationId:org,category:'website',subject:'Race test',body:'Synthetic concurrency'},request=uuid();
  await a.begin();await b.begin();const first=await cmd(a,'create',null,null,request,payload);const pending=cmd(b,'create',null,null,request,payload);await blocked(b);await a.query('commit');assert.equal((await pending).id,first.id);await b.query('commit');passed++;
  assert.equal((await admin.query('select count(*)::int n from public.support_tickets where id=$1',[first.id])).rows[0].n,1);passed++;
  await a.begin();await staff.begin();await cmd(a,'reply',first.id,0,uuid(),{body:'Student reply'});const stale=cmd(staff,'status',first.id,0,uuid(),{status:'RESOLVED'}).then(()=>null,e=>e.code);await blocked(staff);await a.query('commit');assert.equal(await stale,'PT409');await staff.query('rollback');passed++;
  const e1=await actor(1,'postgres'),e2=await actor(1,'postgres'),eventKey='concurrent-'+uuid();
  const emit=c=>c.query("select private.emit_notification($1,'support_reply',$2,$3,$4)",[eventKey,org,first.id,[uid]]);
  await e1.begin();await e2.begin();await emit(e1);const emitPending=emit(e2);await blocked(e2);await e1.query('commit');await emitPending;await e2.query('commit');
  assert.equal((await admin.query('select count(*)::int n from public.notifications n join private.notification_events e on e.id=n.event_id where e.event_key=$1',[eventKey])).rows[0].n,1);passed++;
  await admin.query("insert into private.push_subscriptions(user_id,endpoint,p256dh,auth) values($1,'https://fcm.googleapis.com/fcm/send/race-test',$2,$3)",[uid,'a'.repeat(87),'b'.repeat(22)]);
  await admin.query("insert into public.notification_preferences(user_id,event_type,push) values($1,'support_reply',true) on conflict(user_id,event_type) do update set push=true,in_app=true",[uid]);
  for(let i=0;i<2;i++)await admin.query("select private.emit_notification($1,'support_reply',$2,$3,$4)",['queue-'+uuid(),org,first.id,[uid]]);
  const w1=await actor(1,'service_role'),w2=await actor(1,'service_role');await w1.begin();await w2.begin();
  const q=(await w1.query("select public.notification_worker('claim') jobs")).rows[0].jobs;
  assert.ok(q.length>=2);assert.equal((await w2.query("select public.notification_worker('claim') jobs")).rows[0].jobs.length,0);await w1.query('commit');await w2.query('commit');passed++;
  await admin.query("update private.notification_deliveries set lease_until=clock_timestamp()-interval '1 second' where id=$1",[q[0].id]);await w2.begin();
  const reclaimed=(await w2.query("select public.notification_worker('claim') jobs")).rows[0].jobs;assert.equal(reclaimed.length,1);assert.notEqual(reclaimed[0].lease,q[0].lease);await w2.query('commit');passed++;
  await w1.begin();const expired=await w1.query("select public.notification_worker('finish',$1)",[{id:q[0].id,lease:q[0].lease,status:201}]).then(()=>null,e=>e.code);assert.equal(expired,'PT409');await w1.query('rollback');passed++;
  await w2.begin();await w2.query("select public.notification_worker('finish',$1)",[{id:reclaimed[0].id,lease:reclaimed[0].lease,status:503}]);await w2.query('commit');
  const delayed=(await admin.query('select status,next_attempt_at>clock_timestamp() delayed from private.notification_deliveries where id=$1',[q[0].id])).rows[0];assert.equal(delayed.status,'pending');assert.ok(delayed.delayed);passed++;
  console.log(`PASS communications concurrency: ${passed} cases`);
 }finally{for(const c of clients){await c.query('rollback').catch(()=>{});await c.end();}}
};
