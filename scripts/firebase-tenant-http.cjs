// Real Firebase tokens only; private manifest must describe approved development
// accounts already mapped to synthetic LMS fixtures. No privileged Supabase key.
require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const assert = require('node:assert/strict');
const required = ['owner-a', 'teacher-a', 'student-a', 'teacher-b', 'student-b', 'multi-role', 'suspended'];
async function main() {
  const file = '.local/firebase-http-identities.json';
  if (!fs.existsSync(file)) {
    console.log(JSON.stringify({ blocked: true, reason: 'Real verified development accounts, authenticated claims and approved UUID mappings are not configured.', required }));
    process.exitCode = 2; return;
  }
  const fixtures = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(fixtures.map(f => f.label).sort(), [...required].sort());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  let passed = 0;
  for (const fixture of fixtures) {
    const refreshed = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: fixture.refreshToken }), signal: AbortSignal.timeout(15000) });
    assert.equal(refreshed.status, 200, `${fixture.label}: Firebase refresh`);
    const { id_token: token } = await refreshed.json();
    const request = async (path, body) => {
      const response = await fetch(`${url}/rest/v1/${path}`, { method: body ? 'POST' : 'GET',
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) });
      return { status: response.status, body: await response.json() };
    };
    const identity = await request('rpc/current_profile_id', {});
    assert.equal(identity.status, 200);
    assert.equal(identity.body, fixture.label === 'suspended' ? null : fixture.profileId); passed++;
    const courses = await request('courses?select=id'); assert.equal(courses.status, 200);
    assert.deepEqual(courses.body.map(c => c.id).sort(), [...fixture.allowedCourseIds].sort()); passed++;
    const profiles = await request('profiles?select=id'); assert.equal(profiles.status, 200);
    assert.deepEqual(profiles.body.map(p => p.id).sort(), [...fixture.allowedProfileIds].sort()); passed++;
    assert.equal((await request('assessment_options?select=is_correct')).status, 403); passed++;
    assert.equal((await request('rpc/get_assessment_answer_keys', { p_assessment_id: '70000000-0000-0000-0000-000000000001' })).status,
      fixture.canGradeA ? 200 : 403); passed++;
    if (fixture.label !== 'suspended') {
      const onboarded = await Promise.all(Array.from({ length: 5 }, () => request('rpc/onboard_firebase_profile', {})));
      assert.ok(onboarded.every(r => r.status === 200 && r.body === fixture.profileId)); passed++;
    }
    for (const table of ['enrollments', 'lesson_progress', 'assessment_attempts']) {
      const own = await request(`${table}?select=user_id`); assert.equal(own.status, 200);
      if (fixture.label.startsWith('student') || fixture.label === 'suspended') assert.ok(own.body.every(row => row.user_id === fixture.profileId));
      passed++;
    }
  }
  console.log(JSON.stringify({ passed, mode: 'real-Firebase-token-HTTP', remaining: ['Interactive Google/persistence', 'Full server cookie/revocation round-trip', 'Storage file transfers', 'First-ever concurrent onboarding', 'Mutation/assessment concurrency under real tokens'] }));
}
main().catch(() => { console.error('Real Firebase tenant HTTP test failed. Tokens and private responses were not logged.'); process.exitCode = 1; });
