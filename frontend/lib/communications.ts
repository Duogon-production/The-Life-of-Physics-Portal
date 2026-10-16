'use client';
export async function communicate<T>(domain:'notifications'|'support',action:string,data:unknown={},record?:{id?:string|null;version?:number;requestId?:string}):Promise<T>{
 const response=await fetch('/api/communications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain,action,data,...record})});
 const body=await response.json();if(!response.ok)throw Object.assign(new Error(body.error||'Service unavailable'),{status:response.status});return body;
}
