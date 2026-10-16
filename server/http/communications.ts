import 'server-only';
import { NextRequest,NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isFirebaseStaging } from '@/shared/auth-config';
import { validFirebaseOrigin } from '@/server/http/firebase/route';
import { getApplicationViewer } from '@/server/services/application-auth';
import { communicationService,communicationFailure } from '@/server/services/communications';
import { communicationRequest,validateCommunication } from '@/shared/contracts/communications';
import type { Json } from '@/shared/contracts/database.types';
export async function communicationsPOST(request:NextRequest){
 if(!isFirebaseStaging()||process.env.LMS_DATA_BACKEND!=='supabase-staging')return NextResponse.json({error:'Not found'},{status:404});
 if(!validFirebaseOrigin(request))return NextResponse.json({error:'Invalid origin'},{status:403});
 try{
  const viewer=await getApplicationViewer();if(!viewer||viewer.backend!=='firebase')throw communicationFailure('Sign in required',401);
  if(!request.headers.get('content-type')?.startsWith('application/json'))throw communicationFailure('JSON required',415);
  const reader=request.body?.getReader();if(!reader)throw communicationFailure('Body required');let size=0;const parts:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>16000){await reader.cancel();throw communicationFailure('Request too large',413);}parts.push(value);}
  const v=communicationRequest.parse(JSON.parse(Buffer.concat(parts).toString('utf8')));
  const data=validateCommunication(v.domain,v.action,v.data);
  if(v.domain==='notifications'&&v.action==='push-config')return NextResponse.json({publicKey:process.env.PUSH_VAPID_PUBLIC_KEY||null},{headers:{'Cache-Control':'private, no-store'}});
  if(v.domain==='support'&&!['list','organizations','get'].includes(v.action)&&!v.requestId)throw communicationFailure('Request ID required');
  if(v.domain==='support'&&!['list','organizations','create'].includes(v.action)&&!v.id)throw communicationFailure('Ticket ID required');
  const result=await (await communicationService())(v.domain,v.action,data as Json,v.id??null,v.version??null,v.requestId??null);
  return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }catch(e){const status=e instanceof ZodError||e instanceof SyntaxError?400:(e as {status?:number}).status??503;
  return NextResponse.json({error:status===400?'Check the entered details.':status===503?'Notifications and support are unavailable. Retry shortly.':(e as Error).message},{status,headers:{'Cache-Control':'no-store'}});
 }
}
