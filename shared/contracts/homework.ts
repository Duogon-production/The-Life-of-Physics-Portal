import { z } from 'zod';
const id=z.string().uuid();
export const homeworkOption=z.object({id,text:z.string().max(2000)}).strict();
export const homeworkQuestion=z.object({id,type:z.enum(['single_choice','multiple_choice','essay']),text:z.string().max(10000),imageId:id.nullable(),points:z.number().int().min(0).max(1000),responseMode:z.enum(['text','photo','both']),options:z.array(homeworkOption).max(8),correctIds:z.array(id).max(8),modelAnswer:z.string().max(10000)}).strict().superRefine((q,c)=>{
 if(new Set(q.options.map(o=>o.id)).size!==q.options.length)c.addIssue({code:'custom',message:'Option identifiers must be unique'});
 if(q.type==='essay'){if(q.options.length||q.correctIds.length)c.addIssue({code:'custom',message:'Written questions have no choice key'});}
 else if(q.options.length<2||q.correctIds.some(v=>!q.options.some(o=>o.id===v))||new Set(q.correctIds).size!==q.correctIds.length||q.type==='single_choice'&&q.correctIds.length>1)c.addIssue({code:'custom',message:'Check the option structure and key'});
});
export const homeworkDefinition=z.object({title:z.string().trim().min(1).max(200),instructions:z.string().max(20000),mode:z.enum(['FILE_UPLOAD','PLATFORM_QUESTIONS']),published:z.boolean(),usesMarks:z.boolean(),filePoints:z.number().int().min(0).max(1000),questions:z.array(homeworkQuestion).max(100),modelAnswer:z.string().max(20000),solutionVideo:z.string().max(2048),solutionVideoId:id.nullable(),referenceIds:z.array(id).max(10),solutionIds:z.array(id).max(10)}).strict().superRefine((d,c)=>{
 if(d.mode==='FILE_UPLOAD'&&d.questions.length)c.addIssue({code:'custom',message:'File homework does not contain questions'});
 if(d.mode==='PLATFORM_QUESTIONS'&&!d.questions.length)c.addIssue({code:'custom',message:'Add at least one question'});
 if(new Set(d.questions.map(q=>q.id)).size!==d.questions.length)c.addIssue({code:'custom',message:'Question identifiers must be unique'});
 if(d.published&&d.questions.some(q=>q.type!=='essay'&&!q.correctIds.length))c.addIssue({code:'custom',message:'Select the correct options before publishing'});
});
export type HomeworkQuestion=z.infer<typeof homeworkQuestion>;
export type HomeworkDefinition=z.infer<typeof homeworkDefinition>;
export type HomeworkAnswer={questionId:string;optionIds:string[];text:string;fileIds:string[]};
export const homeworkAnswers=z.array(z.object({questionId:id,optionIds:z.array(id).max(8),text:z.string().max(20000),fileIds:z.array(id).max(4)}).strict()).max(100);
export function newHomeworkQuestion():HomeworkQuestion {return {id:crypto.randomUUID(),type:'single_choice',text:'',imageId:null,points:1,responseMode:'both',options:Array.from({length:4},()=>({id:crypto.randomUUID(),text:''})),correctIds:[],modelAnswer:''};}
export function newHomeworkDefinition():HomeworkDefinition {return {title:'',instructions:'',mode:'FILE_UPLOAD',published:false,usesMarks:true,filePoints:10,questions:[],modelAnswer:'',solutionVideo:'',solutionVideoId:null,referenceIds:[],solutionIds:[]};}
/** Switching tabs preserves authored questions; explicit discard is required by the editor. */
export function platformQuestions(existing:HomeworkQuestion[]) {return existing.length?existing:[newHomeworkQuestion()];}
export function homeworkAssignmentLabel(assignment:{title:string;status:string;version:number},staff:boolean){return `${assignment.title} · ${staff?assignment.status+' · ':''}v${assignment.version}`;}
export function compactHomeworkChoices(q:Pick<HomeworkQuestion,'type'|'options'>){return q.type!=='essay'&&q.options.every(o=>!o.text.trim());}
export type HomeworkFile={id:string;name:string;mime:string;url?:string};
export type HomeworkSubmission={id:string;revision:number;number:number;status:'draft'|'submitted';submittedAt:string|null;answers:HomeworkAnswer[];files:HomeworkFile[];correction?:{status:string;revision:number;released:boolean;score:number|null;feedback:string;marks:{questionId:string;points:number|null;feedback:string}[];annotations:HomeworkAnnotation[]}};
export type HomeworkAnnotation={id:string;fileId:string;page:number;x:number;y:number;width:number;height:number;note:string;revision:number;author:string;updatedAt:string};
export type HomeworkView={mediaCopyPending?:boolean;historyHasMore?:boolean;id:string;offeringId:string;lessonId:string;segmentId:string|null;revision:number;locked:boolean;staff:boolean;canGrade:boolean;canRelease:boolean;definition:HomeworkDefinition;submissions:HomeworkSubmission[];solutions:null|{text:string;video:string;videoId:string|null;files:HomeworkFile[];keys:{questionId:string;correctIds:string[];modelAnswer:string}[]};references:HomeworkFile[]};
