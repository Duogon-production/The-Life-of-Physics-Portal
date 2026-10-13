import 'server-only';
import { NextRequest,NextResponse } from 'next/server';
import { isFirebaseStaging } from '@/shared/auth-config';
import { learningService } from '@/server/services/lessons';
import { lessonId } from '@/shared/contracts/lessons';
export async function lessonResourceGET(_request:NextRequest,{params}:{params:Promise<{courseId:string;resourceId:string}>}) {
 if(!isFirebaseStaging())return new NextResponse(null,{status:404});
 try {const {courseId,resourceId}=await params;lessonId.parse(resourceId);const s=await learningService(courseId);return NextResponse.redirect(await s.resource(resourceId),{status:302,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch{return new NextResponse('Resource unavailable or access expired',{status:403,headers:{'Cache-Control':'no-store'}});}
}
export async function lessonBlockResourceGET(_request:NextRequest,{params}:{params:Promise<{courseId:string;resourceId:string}>}) {
 if(!isFirebaseStaging())return new NextResponse(null,{status:404});
 try{const {courseId,resourceId}=await params;lessonId.parse(resourceId);const s=await learningService(courseId);return NextResponse.redirect(await s.blockResource(resourceId),{status:302,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch{return new NextResponse('Resource unavailable or access expired',{status:403,headers:{'Cache-Control':'no-store'}});}
}
