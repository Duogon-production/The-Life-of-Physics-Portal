// Fresh in-memory PostgreSQL. No network connection or environment credentials.
// Install the pinned optional runtime outside the application dependencies:
// npm install --prefix .local/step03a/runtime --save-exact @electric-sql/pglite@0.5.8
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

(async () => {
 let db,admin,database,makeClient;
 if(process.argv.includes('--postgres')) {
  const {Client}=require(path.resolve('.local/step03a/runtime/node_modules/pg'));
  const port=Number(fs.readFileSync('.local/step03a/pg-port.txt','utf8').trim());
  assert.ok(Number.isInteger(port)&&port>1024&&port<65536);
  const options={host:'127.0.0.1',port,user:'postgres',database:'postgres'};
  admin=new Client(options);await admin.connect();
  database='edulabs_step03a_'+randomUUID().replaceAll('-','');
  assert.match(database,/^edulabs_step03a_[a-f0-9]{32}$/);
  await admin.query(`create database ${database}`);
  makeClient=async()=>{const c=new Client({...options,database});await c.connect();return c;};
  const c=await makeClient();
  db={exec:async sql=>{const r=await c.query(sql);return Array.isArray(r)?r:[r];},query:(...args)=>c.query(...args),close:()=>c.end()};
 } else {
  const {PGlite}=require(path.resolve('.local/step03a/runtime/node_modules/@electric-sql/pglite'));
  db=new PGlite();
 }
 try {
  let bootstrap=fs.readFileSync('supabase/tests/local-bootstrap.sql','utf8');
  if(admin) bootstrap=bootstrap.replace(/create role (\w+) ([^;]+);/g,(_,role,flags)=>`do $$ begin if not exists(select 1 from pg_roles where rolname='${role}') then create role ${role} ${flags}; end if; end $$;`);
  await db.exec(bootstrap);
  for (const name of fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort()) {
   try { await db.exec(fs.readFileSync(path.join('supabase/migrations',name),'utf8')); }
   catch(e) { throw new Error(`Migration ${name}: ${e.message}`,{cause:e}); }
   console.log(`Replayed ${name}`);
  }
  await db.exec(fs.readFileSync('supabase/seed.sql','utf8'));
  const baseline = (await db.query('select count(*)::int n from public.assessment_attempts')).rows[0].n;
  for (const name of ['authorization','hardening','firebase-identity','organization-owner-cascade','organization-provisioning','teacher-editor','exam-attempts-results','exam-authoring','exam-completion']) {
   let sql=fs.readFileSync(`supabase/tests/${name}.sql`,'utf8');
   try {
    const results=await db.exec(sql);
    console.log(`PASS ${name}`,JSON.stringify(results.flatMap(r=>r.rows).filter(r=>r.passed!==undefined || Object.keys(r).some(k=>k.endsWith('_tests')||k.endsWith('_results')))));
   } catch(e) { throw new Error(`Suite ${name}: ${e.message}`,{cause:e}); }
   assert.equal((await db.query('select count(*)::int n from public.assessment_attempts')).rows[0].n,baseline,`${name} rolled back`);
  }
  if(admin) await require('./exam-concurrency.cjs')(makeClient,db);
  if(admin && process.argv.includes('--timers')) await require('./exam-deadline.cjs')(makeClient,db);
  console.log('All local SQL suites passed. No connected Supabase database accessed.');
 } finally {
  await db.close();
  if(admin) {await admin.query(`drop database ${database}`);await admin.end();}
 }
})().catch(e=>{console.error(e.message); if(e.cause?.where) console.error(e.cause.where); process.exitCode=1;});
