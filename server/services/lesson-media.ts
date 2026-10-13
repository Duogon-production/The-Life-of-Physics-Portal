import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/contracts/database.types';

/** Caller JWT + Storage policies authorize every image; no public bucket URLs. */
export async function lessonThumbnails(client:SupabaseClient<Database>,ids:string[]) {
 const unique=Array.from(new Set(ids));if(unique.length>5000)throw new Error('Thumbnail overview is incomplete');
 const urls:Record<string,string>={};
 for(let i=0;i<unique.length;i+=50){
  const {data,error}=await client.from('media_assets').select('id,bucket,object_path,status,mime_type').in('id',unique.slice(i,i+50));
  if(error)throw new Error('Unable to authorize lesson thumbnails');
  const assets=(data??[]).filter(a=>a.bucket==='lms-course-media'&&a.status==='ready'&&['image/png','image/jpeg','image/webp'].includes(a.mime_type));
  if(!assets.length)continue;
  const signed=await client.storage.from('lms-course-media').createSignedUrls(assets.map(a=>a.object_path),600);
  if(signed.error)throw new Error('Unable to load lesson thumbnails');
  for(const image of signed.data??[]){const asset=assets.find(a=>a.object_path===image.path);if(asset&&image.signedUrl&&!image.error)urls[asset.id]=image.signedUrl;}
 }
 return urls;
}
