import 'server-only';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { validLessonFile } from '@/shared/contracts/lessons';
/** Decode files, not merely their extension/header. Originals are preserved. */
export async function validateHomeworkBytes(bytes:Uint8Array,mime:string):Promise<{pages:number|null}> {
 if(!validLessonFile(bytes,mime))throw new Error('Invalid file signature or size');
 if(mime==='application/pdf'){const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});const pages=pdf.getPageCount();if(pages<1||pages>1000)throw new Error('PDF must contain 1–1000 pages');return {pages};}
 if(mime.startsWith('image/')){const decoded=await sharp(bytes,{limitInputPixels:25000000,failOn:'error'}).raw().toBuffer({resolveWithObject:true});if(!decoded.info.width||!decoded.info.height)throw new Error('Corrupted image');return {pages:1};}
 // Validate the bounded ISO-BMFF container. Actual codec/playback failures remain
 // visible in the player; this is not DRM or a transcoding pipeline.
 const b=Buffer.from(bytes);let offset=0,moov=false,mdat=false;
 while(offset<b.length){if(offset+8>b.length)throw new Error('Truncated MP4 box');let size=b.readUInt32BE(offset);const type=b.toString('ascii',offset+4,offset+8);let header=8;if(size===1){if(offset+16>b.length)throw new Error('Truncated MP4 box');const large=b.readBigUInt64BE(offset+8);if(large>BigInt(b.length))throw new Error('Invalid MP4 box size');size=Number(large);header=16;}if(size===0)size=b.length-offset;if(size<header||offset+size>b.length)throw new Error('Truncated MP4 contents');if(type==='moov'&&size>header)moov=true;if(type==='mdat'&&size>header)mdat=true;offset+=size;}
 if(!moov||!mdat)throw new Error('MP4 lacks playback metadata or video data');return {pages:null};
}
