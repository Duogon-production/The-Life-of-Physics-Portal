'use client';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { homeworkApi } from '@/frontend/lib/homework';
import type { HomeworkAnnotation,HomeworkFile } from '@/shared/contracts/homework';
import { HomeworkFileReview } from './homework-file-review';
type History={page:number;total:number;rows:{id:string;action:string;reason:string;createdAt:string;score:number|null;feedback:string;annotations:HomeworkAnnotation[]}[]};
export function HomeworkHistory({assignmentId,submissionId,files}:{assignmentId:string;submissionId:string;files:HomeworkFile[]}) {
 const [history,setHistory]=useState<History|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(page:number){setBusy(true);setError('');try{setHistory(await homeworkApi<History>(assignmentId,'history',{submissionId,page}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="space-y-3"><Button size="sm" variant="outline" disabled={busy} onClick={()=>void load(0)}>Correction history</Button>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{history&&<><p className="text-xs">{history.total} correction events</p>{history.rows.map(h=><details key={h.id} className="border rounded-xl p-3"><summary className="text-sm cursor-pointer">{h.action} · {new Date(h.createdAt).toLocaleString()}{h.score!==null?` · Mark ${h.score}`:''}</summary><p className="text-sm whitespace-pre-wrap">{h.feedback}</p>{h.reason&&<p className="text-xs">Reason: {h.reason}</p>}{files.filter(f=>h.annotations.some(a=>a.fileId===f.id)).map(f=><HomeworkFileReview key={f.id} assignmentId={assignmentId} file={f} annotations={h.annotations}/>)}</details>)}<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy||history.page===0} onClick={()=>void load(history.page-1)}>Previous correction events</Button><Button size="sm" variant="outline" disabled={busy||(history.page+1)*25>=history.total} onClick={()=>void load(history.page+1)}>Next correction events</Button></div></>}</section>;
}
