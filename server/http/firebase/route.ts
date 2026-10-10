import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/contracts/database.types';
import { getSupabaseConfig } from '@/shared/supabase-config';
import { isFirebaseStaging } from '@/shared/auth-config';
import { firebaseCookie, getFirebaseSession, provisionFirebaseClaim, verifyFirebaseToken } from '@/server/services/firebase-auth';
import { getFirebaseAdminAuth } from '@/server/integrations/firebase-admin';

export function validFirebaseOrigin(request: NextRequest) {
  const configured = process.env.APP_ORIGIN;
  if (!configured && process.env.NODE_ENV === 'production') return false;
  const expected = configured ?? new URL(request.url).origin;
  return request.headers.get('origin') === expected && request.headers.get('sec-fetch-site') !== 'cross-site';
}
export function firebaseUserClient(token: string) {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient<Database>(url, publishableKey, {
    accessToken: async () => token, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
function clearCookie(response: NextResponse) {
  response.cookies.set(firebaseCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
export async function POST(request: NextRequest) {
  if (!isFirebaseStaging()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!validFirebaseOrigin(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const action = new URL(request.url).pathname.split('/').pop();
  try {
    if (action === 'logout') {
      const session = await getFirebaseSession();
      if (session) {
        if (session.identity.role === 'authenticated' && session.identity.email_verified) {
          const { error } = await firebaseUserClient(session.token).rpc('revoke_my_firebase_identity');
          if (error) throw new Error('Database revocation failed');
        }
        await getFirebaseAdminAuth().revokeRefreshTokens(session.identity.uid);
      }
      return clearCookie(NextResponse.json({ ok: true }));
    }
    if (Number(request.headers.get('content-length')) > 18000) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    // Read bounded input even when transfer encoding omits Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 18000) { await reader.cancel(); return NextResponse.json({ error: 'Request too large' }, { status: 413 }); }
      chunks.push(value);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (typeof body.idToken !== 'string') throw new Error('Missing token');
    const identity = await verifyFirebaseToken(body.idToken);
    if (action === 'provision') {
      const refreshRequired = await provisionFirebaseClaim(identity.uid);
      return NextResponse.json({ refreshRequired }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (action !== 'session') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (body.idToken.length > 3800) throw new Error('Identity token exceeds safe cookie size');
    if (identity.role !== 'authenticated' || !identity.email_verified) return NextResponse.json({ error: 'Verify your email and refresh your sign-in first.' }, { status: 403 });
    const { data: profileId, error } = await firebaseUserClient(body.idToken).rpc('onboard_firebase_profile');
    if (error || !profileId) return NextResponse.json({ error: 'LMS identity is unavailable. Contact support.' }, { status: 403 });
    const response = NextResponse.json({ profileId }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(firebaseCookie, body.idToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', path: '/', maxAge: Math.min(3600, Math.max(0, Math.floor(identity.exp - Date.now() / 1000))) });
    return response;
  } catch {
    const response = NextResponse.json({ error: 'Authentication failed. Retry sign-in; contact support if it persists.' }, { status: 401 });
    return action === 'logout' ? clearCookie(response) : response;
  }
}
