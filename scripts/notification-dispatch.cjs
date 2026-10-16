// Trusted server process only. Never imported by the application/browser.
// --in-app-only runs due-session reminders without claiming push deliveries.
const {createClient}=require('@supabase/supabase-js');
const assert=require('node:assert/strict');
async function dispatch(client,webpush,inAppOnly=false){
 const {data,error}=await client.rpc('notification_worker',{p_action:inAppOnly?'sweep':'claim'});
 if(error)throw Error('Notification queue unavailable; no successful dispatch claimed.');
 if(inAppOnly)return {swept:true};
 assert.ok(Array.isArray(data),'Invalid delivery queue response');let sent=0,failed=0,invalidated=0;
 for(let start=0;start<data.length;start+=5)await Promise.all(data.slice(start,start+5).map(async d=>{
  let status=0;
  const checked=await client.rpc('notification_worker',{p_action:'check',p_data:{id:d.id,lease:d.lease}});
  if(checked.error)throw Error('Delivery authorization recheck failed; no successful dispatch claimed.');
  if(checked.data?.valid!==true){invalidated++;return;}
  try{const r=await webpush.sendNotification({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth}},JSON.stringify({type:'edulabs-update'}),{TTL:300,timeout:10000});status=r.statusCode;}
  catch(e){status=Number(e.statusCode)||0;}
  // A provider 2xx means accepted, not proven delivery to the device.
  const ack=await client.rpc('notification_worker',{p_action:'finish',p_data:{id:d.id,lease:d.lease,status}});
  // Cancellation/expiry can revoke the lease even after the provider accepted
  // the generic update. Do not record it as a successfully acknowledged job.
  if(ack.error?.code==='PT409'){invalidated++;return;}
  if(ack.error)throw Error('Delivery lease acknowledgement failed; preserve queue evidence.');
  if(status>=200&&status<300)sent++;else failed++;
 }));return {providerAccepted:sent,notAccepted:failed,...(invalidated?{invalidated}:{})};
}
async function main(){
 const url=new URL(process.env.SUPABASE_URL||'');
 const project=process.env.NOTIFICATION_WORKER_PROJECT_ID;
 if(!project||url.protocol!=='https:'||url.hostname!==project+'.supabase.co'||url.username||url.password)throw Error('Set the explicit worker project ID and matching HTTPS Supabase URL.');
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key||key.length<30)throw Error('Server-only Supabase worker credential is missing.');
 const inAppOnly=process.argv.includes('--in-app-only');let webpush;
 if(!inAppOnly){webpush=require('web-push');const {PUSH_VAPID_SUBJECT:subject,PUSH_VAPID_PUBLIC_KEY:publicKey,PUSH_VAPID_PRIVATE_KEY:privateKey}=process.env;
  if(!subject||!publicKey||!privateKey)throw Error('VAPID configuration is missing; no push delivery will be claimed.');
  webpush.setVapidDetails(subject,publicKey,privateKey);
 }
 const client=createClient(url.href,key,{auth:{persistSession:false,autoRefreshToken:false}});let stopping=false;
 process.once('SIGINT',()=>{stopping=true;});process.once('SIGTERM',()=>{stopping=true;});
 do{console.log(JSON.stringify(await dispatch(client,webpush,inAppOnly)));if(process.argv.includes('--once'))break;
  for(let i=0;i<30&&!stopping;i++)await new Promise(resolve=>setTimeout(resolve,1000));
 }while(!stopping);
}
module.exports={dispatch};
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
