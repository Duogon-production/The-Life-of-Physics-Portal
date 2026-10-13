// Only called by the localhost disposable database harness. No development access.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
module.exports=async function(makeClient,admin){
 const clients=[];async function actor(n){const c=await makeClient();clients.push(c);c.claim=async()=>{await c.query('begin');await c.query("set local lock_timeout='5s'");await c.query('set local role authenticated');await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({iss:'https://gmvouqgjbtbkbhrdruzu.supabase.co/auth/v1',aud:'authenticated',role:'authenticated',sub:`10000000-0000-0000-0000-${String(n).padStart(12,'0')}`})]);};c.pid=(await c.query('select pg_backend_pid() pid')).rows[0].pid;return c;}
 async function blocked(c){for(let i=0;i<100;i++){if((await admin.query('select cardinality(pg_blocking_pids($1)) n',[c.pid])).rows[0].n>0)return;await new Promise(r=>setTimeout(r,10));}throw new Error('Expected real lesson lock wait');}
 try {
 const course=randomUUID(),module=randomUUID(),lesson=randomUUID(),segment=randomUUID(),offering=randomUUID();
 await admin.query("insert into public.courses(id,organization_id,title,slug,status,created_by) values($1::uuid,'20000000-0000-0000-0000-000000000001','Synthetic lesson races',$1::uuid::text,'published','10000000-0000-0000-0000-000000000002')",[course]);
 await admin.query("insert into public.course_modules(id,course_id,title,position) values($1,$2,'Synthetic module',0)",[module,course]);
 await admin.query("insert into public.lessons(id,module_id,title,position,status) values($1,$2,'Synthetic lesson',0,'published')",[lesson,module]);
 await admin.query("insert into public.lesson_segments(id,lesson_id,title,description,position,status) values($1,$2,'Synthetic part','Notes',0,'published')",[segment,lesson]);
 await admin.query("insert into public.course_offerings(id,course_id,name,status) values($1,$2,'Synthetic lesson race offering','active')",[offering,course]);
 await admin.query("insert into public.enrollments(offering_id,user_id,status) values($1,'10000000-0000-0000-0000-000000000005','active')",[offering]);
 const a=await actor(5),b=await actor(5),teacher=await actor(2),teacher2=await actor(2);
 await a.claim();await b.claim();await a.query('select public.save_segment_progress($1,$2,10,false,0)',[offering,segment]);
 const stale=b.query('select public.save_segment_progress($1,$2,20,true,0)',[offering,segment]).then(()=>null,e=>e.code);await blocked(b);await a.query('commit');assert.equal(await stale,'PT409');await b.query('rollback');console.log('PASS lesson race: one initial progress revision wins');
 await teacher.claim();await teacher2.claim();const create="select public.edit_learning_content($1,'create_module',null,null,null,'{\"title\":\"Concurrent module\"}')";
 await teacher.query(create,[course]);const second=teacher2.query(create,[course]);await blocked(teacher2);await teacher.query('commit');await second;await teacher2.query('commit');assert.equal((await admin.query('select count(distinct position)::int n from public.course_modules where course_id=$1',[course])).rows[0].n,3);console.log('PASS lesson race: concurrent creates have unique ordered positions');
 await a.claim();await teacher.claim();await a.query('select public.save_segment_progress($1,$2,15,false,1)',[offering,segment]);
 const hide=teacher.query("select public.edit_learning_content($1,'edit_segment',$2,null,(select updated_at from public.lesson_segments where id=$2),'{\"title\":\"Synthetic part\",\"description\":\"Notes\",\"status\":\"draft\"}')",[course,segment]);await blocked(teacher);await a.query('commit');await hide;await teacher.query('commit');await a.claim();await assert.rejects(a.query('select public.save_segment_progress($1,$2,30,true,2)',[offering,segment]),e=>e.code==='42501');await a.query('rollback');console.log('PASS lesson race: unpublish waits for active save then denies access');
 const stamp=(await admin.query('select updated_at::text stamp from public.lesson_segments where id=$1',[segment])).rows[0].stamp;
 await teacher.claim();await teacher2.claim();
 const edit="select public.edit_learning_content($1,'edit_segment',$2,null,$3,'{\"title\":\"Concurrent edited part\",\"description\":\"Notes\",\"status\":\"draft\"}')";
 await teacher.query(edit,[course,segment,stamp]);const competing=teacher2.query(edit,[course,segment,stamp]).then(()=>null,e=>e.code);
 await blocked(teacher2);await teacher.query('commit');assert.equal(await competing,'PT409');await teacher2.query('rollback');console.log('PASS lesson race: competing teacher edits reject the stale writer');
 async function asset(){const id=randomUUID();await admin.query("insert into public.media_assets(id,organization_id,uploaded_by,kind,mime_type,original_filename,bucket,object_path,status) values($1,'20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','pdf','application/pdf','Synthetic race.pdf','lms-course-media','20000000-0000-0000-0000-000000000001/'||$1::uuid::text||'/race.pdf','ready')",[id]);return id;}
 const shared=await asset();await teacher.claim();await teacher2.claim();
 const attach="select public.edit_learning_content($1,'attach_resource',$2,null,(select updated_at from public.lesson_segments where id=$2),jsonb_build_object('name','Synthetic race PDF','asset_id',$3::text))";
 await teacher.query(attach,[course,segment,shared]);const deleting=teacher2.query('select public.archive_unused_lesson_upload($1)',[shared]).then(()=>null,e=>e.code);
 await blocked(teacher2);await teacher.query('commit');assert.equal(await deleting,'23514');await teacher2.query('rollback');assert.equal((await admin.query('select status from public.media_assets where id=$1',[shared])).rows[0].status,'ready');console.log('PASS lesson race: attaching a file prevents simultaneous cleanup');
 const archived=await asset();await teacher.claim();await teacher2.claim();await teacher2.query('select public.archive_unused_lesson_upload($1)',[archived]);const linking=teacher.query(attach,[course,segment,archived]).then(()=>null,e=>e.code);
 await blocked(teacher);await teacher2.query('commit');assert.equal(await linking,'23514');await teacher.query('rollback');assert.equal((await admin.query('select count(*)::int n from public.lesson_resources where media_asset_id=$1',[archived])).rows[0].n,0);console.log('PASS lesson race: cleanup winner cannot become a referenced file');
 console.log('All 6 independent-session lesson races passed.');
 }finally{await Promise.all(clients.map(async c=>{try{await c.query('rollback');}finally{await c.end();}}));}
};
