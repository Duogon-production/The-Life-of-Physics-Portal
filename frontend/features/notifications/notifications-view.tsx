'use client';
import Link from 'next/link';
import { useCallback,useEffect,useRef,useState } from 'react';
import { Bell,Loader2 } from 'lucide-react';
import { Button } from '@/frontend/components/ui/button';
import { Popover,PopoverContent,PopoverTrigger } from '@/frontend/components/ui/popover';
import { communicate } from '@/frontend/lib/communications';
import { eventLabels,notificationEvents,type NotificationPage,type NotificationPreference } from '@/shared/contracts/communications';
const panel='rounded-2xl border-2 border-black bg-white p-5 shadow-hard-sm';
export function NotificationBell({onNavigate}:{onNavigate?:()=>void}={}){
 const [open,setOpen]=useState(false);
 const [count,setCount]=useState<number|null>(null);
 const [data,setData]=useState<NotificationPage|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const pending=useRef<AbortController|null>(null),sequence=useRef(0);
 const load=useCallback(async(background=false)=>{
  if(background&&pending.current)return;
  const request=++sequence.current;pending.current?.abort();const controller=new AbortController();pending.current=controller;
  const timer=setTimeout(()=>controller.abort(),15000);if(!background){setLoading(true);setData(null);}setError('');
  try{const result=await communicate<NotificationPage>('notifications','list',{filter:'unread',page:0},undefined,{signal:controller.signal});if(request===sequence.current){setData(result);setCount(result.unread);}}
  catch{if(request===sequence.current){setData(null);setCount(null);setError('Notifications could not be loaded. Please retry.');}}
  finally{clearTimeout(timer);if(request===sequence.current){pending.current=null;setLoading(false);}}
 },[]);
 useEffect(()=>{const requests=sequence,controller=pending;void load();const refresh=()=>{if(document.visibilityState==='visible')void load(true);};const timer=setInterval(refresh,30000);window.addEventListener('edulabs-notifications-changed',refresh);return()=>{requests.current++;controller.current?.abort();clearInterval(timer);window.removeEventListener('edulabs-notifications-changed',refresh);};},[load]);
 const navigate=()=>{setOpen(false);onNavigate?.();};
 return <Popover open={open} onOpenChange={value=>{setOpen(value);if(value)void load();}}>
  <PopoverTrigger asChild><button type="button" className="relative shrink-0 rounded-lg border-2 border-black bg-white p-2 shadow-hard-sm hover:bg-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black" aria-label={`Notifications${count===null?'':`, ${count} unread`}`}><Bell aria-hidden className="h-5 w-5"/>{count!==null&&count>0&&<span aria-hidden className="absolute -right-2 -top-2 rounded-full border border-black bg-primary px-1 text-xs font-bold">{count>99?'99+':count}</span>}</button></PopoverTrigger>
  <PopoverContent side="top" align="end" collisionPadding={12} aria-label="Notification preview" className="z-[100] flex w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(32rem,var(--radix-popover-content-available-height))] flex-col bg-white p-4">
   <div className="shrink-0"><h2 className="font-display text-xl">Notifications</h2>
   {count!==null&&<p className="mt-1 text-xs text-slate-600">{count} unread</p>}</div>
   <div className="min-h-0 overflow-y-auto">
   {loading?<p role="status" className="flex items-center gap-2 py-5 text-sm"><Loader2 aria-hidden className="h-4 w-4 animate-spin"/>Loading notifications…</p>:error?<div role="alert" className="py-4 text-sm"><p>{error}</p><Button className="mt-3" variant="outline" onClick={()=>void load()}>Retry</Button></div>:data&&<>
    {data.rows.length===0?<p className="py-5 text-sm text-slate-600">No unread notifications.</p>:<ul className="mt-3 space-y-2">{data.rows.slice(0,5).map(n=><li key={n.id} className="break-words rounded-xl border-2 border-black p-3 text-sm"><p className="font-semibold">{eventLabels[n.event_type]}</p><p className="mt-1 text-xs font-semibold">{n.read_at?'Read':'Unread'}</p><time className="mt-1 block text-xs text-slate-600" dateTime={n.created_at}>{new Date(n.created_at).toLocaleString()}</time>{n.link&&<Link href={n.link} onClick={navigate} className="mt-2 inline-block font-semibold underline">Open notification</Link>}</li>)}</ul>}
   </>}
   </div>
   <Link href="/notifications" onClick={navigate} className="mt-4 block shrink-0 rounded-xl border-2 border-black bg-primary px-3 py-2 text-center text-sm font-semibold shadow-hard-sm">View all notifications</Link>
  </PopoverContent>
 </Popover>;
}
export function NotificationsView(){
 const [data,setData]=useState<NotificationPage|null>(null),[filter,setFilter]=useState('all'),[page,setPage]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [prefs,setPrefs]=useState<NotificationPreference[]>([]),[pushStatus,setPushStatus]=useState(''),[publicKey,setPublicKey]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData(await communicate<NotificationPage>('notifications','list',{filter,page}));}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[filter,page]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{void communicate<NotificationPreference[]>('notifications','preferences').then(setPrefs).catch(e=>setError(e.message));void communicate<{publicKey:string|null}>('notifications','push-config').then(v=>setPublicKey(v.publicKey??'')).catch(()=>setPushStatus('Browser push configuration is unavailable.'));},[]);
 async function action(name:string,body:unknown={}){setBusy(true);setError('');try{await communicate('notifications',name,body);window.dispatchEvent(new Event('edulabs-notifications-changed'));await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function preference(event:typeof notificationEvents[number],inApp:boolean,push:boolean){setBusy(true);try{await communicate('notifications','preference',{event,inApp,push});setPrefs(await communicate<NotificationPreference[]>('notifications','preferences'));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function push(enable:boolean){
  setBusy(true);try{
   if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))throw Error('Browser push is unsupported here. Use a supported browser over HTTPS. On iOS, a supported Home Screen web app may be required.');
   if(enable&&!publicKey)throw Error('Browser push is not configured. In-app notifications still work.');
   const registration=await navigator.serviceWorker.register('/edulabs-push-sw.js');let sub=await registration.pushManager.getSubscription();
   if(enable){const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Browser notification permission was not granted.');if(!sub){const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/'));sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});}const value=sub.toJSON();try{await communicate('notifications','subscribe',{endpoint:value.endpoint,p256dh:value.keys?.p256dh,auth:value.keys?.auth});}catch(e){await sub.unsubscribe();throw e;}setPushStatus('This browser is registered. Enable desired event preferences below. Delivery requires the server dispatcher and is not guaranteed by the browser.');}
   else {if(sub){await communicate('notifications','unsubscribe',{endpoint:sub.endpoint});await sub.unsubscribe();}setPushStatus('Push disabled for this browser.');}
  }catch(e){setPushStatus((e as Error).message);}finally{setBusy(false);}
 }
 return <div className="mx-auto max-w-4xl space-y-5 pb-12">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-black bg-white p-5 shadow-hard"><h1 className="flex items-center gap-3 font-display text-3xl"><Bell/>Notifications</h1><Button disabled={busy||!data?.unread} onClick={()=>void action('read-all')}>Mark all as read</Button></div>
  {error&&<p role="alert" className={panel}>{error}<Button variant="outline" onClick={()=>void load()}>Retry</Button></p>}
  <div className="flex gap-2">{['all','unread','read'].map(f=><Button key={f} variant={filter===f?'default':'outline'} onClick={()=>{setFilter(f);setPage(0);}}>{f}</Button>)}</div>
  {loading?<Loader2 className="mx-auto animate-spin"/>:!error&&data?.rows.length===0?<p className={panel}>No {filter==='all'?'':filter+' '}notifications yet.</p>:data?.rows.map(n=><article key={n.id} className={panel}><p className="font-semibold">{eventLabels[n.event_type]}</p><time className="text-xs text-slate-500" dateTime={n.created_at}>{new Date(n.created_at).toLocaleString()}</time><div className="mt-3 flex flex-wrap gap-2">{n.link?<Link className="text-sm font-semibold underline" href={n.link}>Open</Link>:n.event_type!=='account_approved'&&<span className="text-xs text-slate-500">Resource currently unavailable.</span>}<Button variant="outline" disabled={busy} onClick={()=>void action(n.read_at?'unread':'read',{id:n.id})}>{n.read_at?'Mark unread':'Mark read'}</Button></div></article>)}
  <div className="flex gap-2"><Button variant="outline" disabled={page===0||loading} onClick={()=>setPage(page-1)}>Previous</Button><span className="p-2">Page {page+1}</span><Button variant="outline" disabled={loading||!data||data.rows.length<25} onClick={()=>setPage(page+1)}>Next</Button></div>
  <section className={panel}><h2 className="font-display text-2xl">Preferences</h2><p className="my-2 text-xs text-slate-600">Push permission is requested only when you choose Enable. In-app events are on by default. Browser push is off by default.</p>
   <div className="mb-4 flex flex-wrap gap-2"><Button disabled={busy||!publicKey} onClick={()=>void push(true)}>Enable browser push</Button><Button variant="outline" disabled={busy} onClick={()=>void push(false)}>Disable browser push</Button></div><p role="status" className="text-xs text-slate-600">{pushStatus||(!publicKey?'Browser push is not configured. In-app notifications remain available.':'Push availability depends on your browser and server dispatcher.')}</p>
   {notificationEvents.map(event=>{const p=prefs.find(v=>v.event_type===event);return <div key={event} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3"><span className="text-sm">{eventLabels[event]}</span><div className="flex gap-3 text-xs"><label><input type="checkbox" disabled={busy} checked={p?.in_app??true} onChange={e=>void preference(event,e.target.checked,p?.push??false)}/> In-app</label><label><input type="checkbox" disabled={busy||!publicKey} checked={p?.push??false} onChange={e=>void preference(event,p?.in_app??true,e.target.checked)}/> Push</label></div></div>;})}
  </section>
 </div>;
}
