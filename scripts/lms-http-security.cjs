// Read-only HTTP boundary checks. No registration, impersonation or privileged key.
require('@next/env').loadEnvConfig(process.cwd());
const assert = require('node:assert/strict');
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.ok(url && key?.startsWith('sb_publishable_'), 'Public Supabase configuration required');
  const checks = [];
  for (const table of ['courses', 'profiles']) {
    const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, '42501');
    checks.push(`Anonymous ${table} denied`);
  }
  const privateResponse = await fetch(`${url}/rest/v1/external_identities?select=id`, { headers: { apikey: key, 'Accept-Profile': 'private' }, signal: AbortSignal.timeout(15000) });
  assert.equal(privateResponse.status, 406);
  assert.equal((await privateResponse.json()).code, 'PGRST106');
  checks.push('Private identity schema excluded from API');
  const token = [Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: '10000000-0000-0000-0000-000000000001', role: 'authenticated', exp: Math.floor(Date.now()/1000)+60 })).toString('base64url'), ''].join('.');
  const spoof = await fetch(`${url}/rest/v1/courses?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  assert.equal(spoof.status, 401);
  checks.push('Unsigned privileged-subject JWT rejected');
  console.log(JSON.stringify({ passed: checks.length, checks }));
}
main().catch(() => { console.error('HTTP security check failed; inspect configuration/permissions locally. No credentials or response contents logged.'); process.exitCode = 1; });
