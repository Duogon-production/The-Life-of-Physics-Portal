'use client';
import { useEffect,useState } from 'react';
import { cairoSessionLabel } from '@/shared/contracts/groups';
import type { GroupPage,GroupSession } from '@/shared/contracts/groups';
export function useGroupSessions(enabled:boolean){
 const [data,setData]=useState<GroupPage<GroupSession&{group_name:string}>|null>(null),[error,setError]=useState(''),[clock,setClock]=useState({server:0,client:0}),[now,setNow]=useState(0);
 useEffect(()=>{if(!enabled)return;let active=true;const refresh=async()=>{try{const r=await fetch('/api/study-groups',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'view',groupId:null,data:{section:'upcoming'}})});const v=await r.json();if(!r.ok)throw Error(v.error||'Class schedule unavailable');if(active){setData(v);setClock({server:Date.parse(v.serverNow),client:Date.now()});setError('');}}catch(e){if(active){setError((e as Error).message);setData(null);}}};refresh();const t=setInterval(refresh,data?.catchingUp?1000:30000);return()=>{active=false;clearInterval(t);};},[enabled,data?.catchingUp]);
 useEffect(()=>{if(!enabled)return;const tick=()=>setNow(clock.server?clock.server+Date.now()-clock.client:Date.now());tick();const t=setInterval(tick,1000);return()=>clearInterval(t);},[enabled,clock]);
 const rows=(data?.rows??[]).filter(s=>!s.cancelled&&Date.parse(s.ends_at)>now);
 return {error,loading:enabled&&(!data||!!data.catchingUp)&&!error,serverNow:data?.serverNow,sessions:rows.map(s=>({...s,date:new Date(s.starts_at),endDate:s.ends_at,dayLabel:new Intl.DateTimeFormat('en',{weekday:'long',timeZone:'Africa/Cairo'}).format(new Date(s.starts_at)),dateLabel:new Intl.DateTimeFormat('en',{month:'short',day:'numeric',timeZone:'Africa/Cairo'}).format(new Date(s.starts_at)),timeLabel:new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit',timeZone:'Africa/Cairo'}).format(new Date(s.starts_at)),fullFormatted:cairoSessionLabel(s.starts_at)}))};
}
