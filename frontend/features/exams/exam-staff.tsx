'use client';
import { api } from '@/frontend/lib/api';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Button } from '@/frontend/components/ui/button';
import { ExamGradingPanel } from '@/frontend/features/exams/exam-grading-panel';
import { ExamBuilder } from '@/frontend/features/exams/exam-builder';
export function ExamStaffActions({examId,offeringId,authoringReady}:{examId:string;offeringId:string;authoringReady:boolean}) {
 const [cloning,setCloning]=useState(false);
 const clone=async()=>{try{setCloning(true);const {data}=await api.post<{id:string}>(`/api/secure-exams/${examId}/clone`,{});window.location.assign(`/exams/${data.id}`);}catch{toast.error('Could not clone the exam. The database update may be pending.');}finally{setCloning(false);}};
 const [grading,setGrading]=useState(false);
 const [builder,setBuilder]=useState<'edit'|'new'|null>(null);
 if(builder)return <ExamBuilder examId={builder==='edit'?examId:null} secure offeringId={offeringId} onClose={()=>{setBuilder(null);window.location.reload();}} />;
 return grading?<ExamGradingPanel examId={examId} secure onClose={()=>setGrading(false)} />:<div className="flex flex-wrap gap-2"><Button onClick={()=>setGrading(true)}>Submissions and grading</Button>{authoringReady&&<><Button variant="outline" onClick={()=>setBuilder('edit')}>Edit exam</Button><Button variant="outline" disabled={cloning} onClick={clone}>Clone new version</Button><Button variant="outline" onClick={()=>setBuilder('new')}>New exam for this group</Button></>}</div>;
}
