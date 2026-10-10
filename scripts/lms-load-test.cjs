// Opt-in development HTTP test. Uses publishable key + REAL student JWTs only.
// No signup, fabricated JWTs, service key, production URL or unbounded repetitions.
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');
const { createClient } = require('@supabase/supabase-js');
const levels = [50, 100, 200];
const percent = (values, p) => values.length ? values.slice().sort((a, b) => a-b)[Math.min(values.length-1, Math.ceil(values.length*p)-1)] : null;
async function main() {
  if (process.env.LMS_LOAD_TEST_ENV !== 'development' || !process.env.LMS_LOAD_TEST_PROJECT_REF || !process.env.LMS_LOAD_TEST_SESSIONS) throw new Error('Explicit development project and real session fixture required');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== `https://${process.env.LMS_LOAD_TEST_PROJECT_REF}.supabase.co` || !key?.startsWith('sb_publishable_')) throw new Error('Development project/publishable key mismatch');
  const students = JSON.parse(fs.readFileSync(process.env.LMS_LOAD_TEST_SESSIONS, 'utf8'));
  if (students.length < 200 || new Set(students.map(s => s.profileId)).size !== students.length) throw new Error('200 distinct, active test student sessions required');
  const report = { measuredAt: new Date().toISOString(), transport: 'Supabase HTTP with verified real sessions', resourceUsage: 'Collect project metrics independently; client timings do not measure database CPU/RAM', runs: [] };
  for (const concurrency of levels) {
    const timings = {}; const errors = {};
    const observe = async (name, fn) => {
      const start = performance.now();
      try { const { data, error } = await fn(); if (error) throw error; return data; }
      catch (error) { errors[name] = (errors[name] || 0) + 1; throw new Error('Workload operation failed'); }
      finally { (timings[name] ||= []).push(performance.now()-start); }
    };
    const results = await Promise.allSettled(students.slice(0, concurrency).map(async student => {
      const client = createClient(url, key, { accessToken: async () => student.accessToken, auth: { persistSession: false, autoRefreshToken: false } });
      const { data: identity, error } = await client.auth.getUser(student.accessToken);
      if (error || identity.user?.id !== student.profileId) throw new Error('Real student identity did not verify');
      const attempt = await observe('start', () => client.rpc('start_assessment_attempt', { p_offering_assessment_id: student.offeringAssessmentId }));
      await observe('save', () => client.rpc('save_assessment_response', { p_attempt_id: attempt, p_question_id: student.questionId, p_response: student.response }));
      await observe('submit', () => client.rpc('submit_assessment_attempt', { p_attempt_id: attempt }));
      await observe('progress', () => client.from('lesson_progress').upsert({ offering_id: student.offeringId, lesson_id: student.lessonId, user_id: student.profileId, status: 'in_progress', last_accessed_at: new Date().toISOString() }, { onConflict: 'offering_id,lesson_id,user_id' }));
    }));
    report.runs.push({ concurrency, failedStudents: results.filter(r => r.status==='rejected').length, operations: Object.fromEntries(Object.entries(timings).map(([name, values]) => [name, { requests: values.length, errors: errors[name] || 0, p50ms: percent(values,.5), p95ms: percent(values,.95), maxMs: Math.max(...values) }])) });
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.runs.some(r => r.failedStudents)) process.exitCode = 1;
}
main().catch(() => { console.error('Load test did not start/complete. Configure dedicated development users and fixtures; no authentication bridge is provided.'); process.exitCode = 1; });
