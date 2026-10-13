'use client';
import { getSupabaseBrowserClient } from '@/frontend/lib/supabase';
import { lessonFileFormats,lessonUploadIntent } from '@/shared/contracts/lessons';

/** Large files go straight to private Storage with the caller's Firebase JWT.
 * The server registers ownership and validates stored bytes before readiness. */
export async function uploadLessonFile(courseId:string,file:File) {
 const input=lessonUploadIntent.parse({mime:file.type,name:file.name});
 if(!file.size||file.size>lessonFileFormats[input.mime].limit)throw new Error('File exceeds the allowed size.');
 async function request(action:string,body:unknown){const r=await fetch(`/api/learning/${courseId}/${action}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw new Error(v.error||'Upload failed');return v;}
 const intent=await request('upload-intent',input);
 try {
  const result=await getSupabaseBrowserClient().storage.from('lms-course-media').upload(intent.path,file,{contentType:input.mime,upsert:false});
  if(result.error)throw new Error('Storage upload failed. Retry the file.');
  return await request('finish-upload',{id:intent.id});
 }catch(e){try{await request('cleanup',{id:intent.id});}catch{throw new Error(`Upload failed; exact asset ${intent.id} retained for trusted cleanup.`);}throw e;}
}
