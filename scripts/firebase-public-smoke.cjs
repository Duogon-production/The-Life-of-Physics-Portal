// Creates ONE temporary password account, exercises real Firebase endpoints,
// and deletes ONLY that account using its own ID token. No Admin credentials.
require('@next/env').loadEnvConfig(process.cwd());
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
async function main() {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  assert.ok(key && projectId, 'Public Firebase configuration required');
  const request = async (method, body) => {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(`Firebase ${method}: ${result.error?.message?.split(' : ')[0] || response.status}`);
    return result;
  };
  const email = `codex-auth-${crypto.randomUUID()}@example.invalid`;
  const password = crypto.randomBytes(32).toString('base64url');
  let token; let app; const checks = [];
  try {
    const registered = await request('signUp', { email, password, returnSecureToken: true });
    token = registered.idToken; checks.push('Real email/password registration');
    const signedIn = await request('signInWithPassword', { email, password, returnSecureToken: true });
    token = signedIn.idToken; assert.equal(signedIn.localId, registered.localId); checks.push('Real email/password sign-in');
    const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${key}`, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: signedIn.refreshToken }), signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200); const refreshed = await response.json(); token = refreshed.id_token;
    assert.equal(refreshed.user_id, registered.localId); checks.push('Real Firebase refresh-token exchange');
    app = initializeApp({ projectId }, `public-smoke-${Date.now()}`);
    const verified = await getAuth(app).verifyIdToken(token, false);
    assert.equal(verified.uid, registered.localId); assert.equal(verified.aud, projectId);
    assert.equal(verified.iss, `https://securetoken.google.com/${projectId}`); checks.push('Real Firebase signature, issuer, audience and expiry verification (without revocation)');
    await assert.rejects(getAuth(app).verifyIdToken(`${token.slice(0, -8)}invalid`, false)); checks.push('Forged Firebase signature rejected');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const denied = await fetch(`${url}/rest/v1/courses?select=id`, { headers: { apikey: publishable, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    assert.equal(denied.status, 401); assert.equal((await denied.json()).code, '42501');
    checks.push('Supabase accepts the configured Firebase issuer but denies data without authenticated claim');
    console.log(JSON.stringify({ passed: checks.length, checks, blocked: ['Claim provisioning and verified-email tenant access require Firebase Admin credentials', 'Google login requires interactive account approval', 'Revocation, browser persistence and server session round-trip require configured staging'] }));
  } finally {
    if (token) { await request('delete', { idToken: token }); console.log('Temporary Firebase test account deleted.'); }
    if (app) await deleteApp(app);
  }
}
main().catch(error => { console.error(error.message.replace(/AIza[\w-]+/g, '[public-key]')); process.exitCode = 1; });
