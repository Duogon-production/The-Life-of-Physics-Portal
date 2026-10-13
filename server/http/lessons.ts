import 'server-only';
import { NextRequest,NextResponse } from 'next/server';
import { z } from 'zod';
import { isFirebaseStaging } from '@/shared/auth-config';
import { validFirebaseOrigin } from '@/server/http/firebase/route';
import { learningService,lessonFailure } from '@/server/services/lessons';
import { lessonId,lessonUploadIntent } from '@/shared/contracts/lessons';

export async function lessonsPOST(request:NextRequest,context:{params:Promise<{courseId:string;action:string}>}) {
 if(!isFirebaseStaging()||process.env.LMS_DATA_BACKEND!=='supabase-staging')return NextResponse.json({error:'Not found'},{status:404});
 if(!validFirebaseOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 try {
  const {courseId,action}=await context.params;lessonId.parse(courseId);
  if(!['edit','progress','upload','media','cleanup','upload-intent','finish-upload'].includes(action))throw lessonFailure('Not found',404);
  const service=await learningService(courseId,['edit','upload','cleanup','upload-intent','finish-upload'].includes(action));
  const limit=action==='upload'?50_000_000:600000;
  const reader=request.body?.getReader();if(!reader)throw lessonFailure('Body required');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw lessonFailure('Request too large',413);}chunks.push(value);}
  let result;
  if(action==='upload')result=await service.upload(Buffer.concat(chunks),request.headers.get('content-type')??'',decodeURIComponent(request.headers.get('x-file-name')??'resource'));
  else {
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw lessonFailure('JSON required',415);
   const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(action==='edit')result={id:await service.edit(input)};
   else if(action==='upload-intent'){const v=lessonUploadIntent.parse(input);result=await service.registerUpload(v.mime,v.name);}
   else if(action==='finish-upload'){const v=z.object({id:lessonId}).strict().parse(input);result=await service.finishUpload(v.id);}
   else if(action==='cleanup'){const v=z.object({id:lessonId}).strict().parse(input);result=await service.cleanup(v.id);}
   else if(action==='media'){const v=z.object({id:lessonId}).strict().parse(input);result={url:await service.media(v.id)};}
   else {const v=z.object({offeringId:lessonId,segmentId:lessonId,position:z.number().int().min(0).max(604800),complete:z.boolean(),revision:z.number().int().nonnegative()}).strict().parse(input);result=await service.saveProgress(v.offeringId,v.segmentId,v.position,v.complete,v.revision);}
  }
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){const status=e instanceof z.ZodError||e instanceof SyntaxError||e instanceof URIError?400:(e as {status?:number}).status??503;
  return NextResponse.json({error:status===503?'Lessons is unavailable. Retry or contact your teacher.':(e as Error).message},{status,headers:{'Cache-Control':'no-store'}});
 }
}
