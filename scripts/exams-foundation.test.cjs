// Delivery 1 (Exams foundation) tests. Run: node --test scripts/exams-foundation.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, requires = {}) {
  const mod = { exports: {} };
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(out, { module: mod, exports: mod.exports, require: n => { if (n in requires) return requires[n]; throw new Error('unexpected import ' + n); } });
  return mod.exports;
}

const listing = load('shared/contracts/exam-listing.ts');
const NOW = Date.parse('2026-10-11T12:00:00Z');
const attempt = (status, deadlineAt = null) => ({ status, deadlineAt });

test('listing state is derived only from real attempt/window data', () => {
  const d = (attempts, opensAt = null, closesAt = null) => listing.deriveExamListState({ opensAt, closesAt, attempts }, NOW);
  assert.equal(d([]), 'NOT_STARTED');
  assert.equal(d([attempt('in_progress', '2026-10-11T13:00:00Z')]), 'IN_PROGRESS');
  assert.equal(d([attempt('in_progress')]), 'IN_PROGRESS'); // unlimited
  assert.equal(d([attempt('in_progress', '2026-10-11T11:00:00Z')]), 'TIME_EXPIRED');
  assert.equal(d([attempt('submitted')]), 'SUBMITTED');
  assert.equal(d([attempt('submitted'), attempt('graded')]), 'GRADED');
  assert.equal(d([], '2026-10-12T00:00:00Z'), 'NOT_OPEN_YET');
  assert.equal(d([], null, '2026-10-10T00:00:00Z'), 'CLOSED');
  // a submitted attempt is still shown after the window closes
  assert.equal(d([attempt('submitted')], null, '2026-10-10T00:00:00Z'), 'SUBMITTED');
});

test('time limit and attempt formatting; null means unlimited', () => {
  assert.equal(listing.formatTimeLimit(null), 'No time limit');
  assert.equal(listing.formatTimeLimit(60), '1 min');
  assert.equal(listing.formatTimeLimit(90), '1 min 30 sec');
  assert.equal(listing.formatTimeLimit(5400), '1 h 30 min');
  assert.equal(listing.formatAttempts(1), '1 attempt allowed');
  assert.equal(listing.formatAttempts(2), '2 attempts allowed');
  assert.match(listing.formatAttempts(null), /not configured/);
});

test('Firebase middleware allowlist exposes only /exams and /exams/<uuid>', () => {
  const { isPhaseOneRoute } = load('shared/website-routes.ts');
  const id = '20000000-0000-0000-0000-000000000001';
  assert.equal(isPhaseOneRoute('/exams'), true);
  assert.equal(isPhaseOneRoute(`/exams/${id}`), true);
  for (const p of ['/exams/x', '/exams/' + '-'.repeat(36), `/exams/${id}/extra`, '/exams/', '/api/exams', '/courses/id/chapters/lesson']) {
    assert.equal(isPhaseOneRoute(p), false, p);
  }
  assert.equal(isPhaseOneRoute('/home'), true); // pre-existing behaviour intact
});

function fakeClient(tables, error = null) {
  const calls = [];
  const client = { from(table) {
    const q = { table, select: null, filters: [] };
    calls.push(q);
    const chain = { select: c => (q.select = c, chain), eq: (c, v) => (q.filters.push(['eq', c, v]), chain), in: (c, v) => (q.filters.push(['in', c, v]), chain),
      order: () => chain, limit: () => chain, then: (res, rej) => Promise.resolve({ data: tables[table] ?? [], error }).then(res, rej) };
    return chain;
  } };
  return { client, calls };
}

test('repository is read-only, never selects answer keys, and scopes attempts to the viewer', async () => {
  const { createExamsRepository } = load('server/repositories/exams.ts', { 'server-only': {}, '@/shared/contracts/exam-listing': listing });
  const { client, calls } = fakeClient({
    offering_assessments: [{ id: 's1', offering_id: 'o1', assessment_id: 'a1', opens_at: null, closes_at: null, time_limit_seconds: null, max_attempts: 2, published: true }],
    assessments: [{ id: 'a1', course_id: 'c1', title: 'Physics Exam', type: 'exam', instructions: null, status: 'published' }],
    course_offerings: [{ id: 'o1', course_id: 'c1', name: 'Group A' }],
    courses: [{ id: 'c1', title: 'Physics' }],
    assessment_attempts: [{ offering_assessment_id: 's1', attempt_number: 1, status: 'submitted', started_at: '2026-10-11T10:00:00Z', deadline_at: null, submitted_at: '2026-10-11T10:30:00Z', score: 9, max_score: 10 }],
    assessment_questions: [{ assessment_id: 'a1' }, { assessment_id: 'a1' }],
  });
  const repo = createExamsRepository(client, 'profile-1');
  const { items, truncated } = await repo.list({ studentView: true });
  assert.equal(truncated, false);
  assert.equal(items.length, 1);
  assert.equal(items[0].questionCount, 2);
  assert.equal(items[0].state, 'SUBMITTED');
  assert.equal(items[0].timeLimitSeconds, null);
  assert.equal(items[0].maxAttempts, 2);
  assert.equal(items[0].attempts[0].score, null, 'unreleased score is stripped before rendering');
  assert.equal(items[0].attempts[0].maxScore, null);
  for (const c of calls) assert.doesNotMatch(c.select ?? '', /is_correct|answer|correct/i);
  assert.ok(!calls.some(c => c.table === 'assessment_options'), 'options (and keys) are not read by the listing');
  const attemptQuery = calls.find(c => c.table === 'assessment_attempts');
  assert.ok(attemptQuery.filters.some(f => f[0] === 'eq' && f[1] === 'user_id' && f[2] === 'profile-1'));
  assert.ok(calls.find(c => c.table === 'offering_assessments').filters.some(f => f[1] === 'published' && f[2] === true));
  assert.ok(calls.find(c => c.table === 'offering_assessments').filters.some(f => f[0] === 'in' && f[1] === 'assessments.type' && f[2].join(',') === 'exam,quiz'));
});

test('rows hidden by RLS are skipped instead of fabricated', async () => {
  const { createExamsRepository } = load('server/repositories/exams.ts', { 'server-only': {}, '@/shared/contracts/exam-listing': listing });
  const { client } = fakeClient({ offering_assessments: [{ id: 's1', offering_id: 'o1', assessment_id: 'a1', opens_at: null, closes_at: null, time_limit_seconds: 60, max_attempts: 1, published: true }] });
  const { items } = await createExamsRepository(client, 'p').list({ studentView: true });
  assert.equal(items.length, 0);
});

test('empty result returns an empty list', async () => {
  const { createExamsRepository } = load('server/repositories/exams.ts', { 'server-only': {}, '@/shared/contracts/exam-listing': listing });
  const { client } = fakeClient({});
  const r = await createExamsRepository(client, 'p').list({ studentView: true });
  assert.equal(r.items.length, 0);
  assert.equal(r.truncated, false);
});

test('exams and quizzes are listed; homework and practice are excluded even on detail reads', async () => {
  const { createExamsRepository } = load('server/repositories/exams.ts', { 'server-only': {}, '@/shared/contracts/exam-listing': listing });
  for (const kind of ['exam','quiz','assignment','practice']) {
    const {client}=fakeClient({offering_assessments:[{id:'s',offering_id:'o',assessment_id:'a'}],
      assessments:[{id:'a',type:kind,title:kind}],course_offerings:[{id:'o',course_id:'c',name:'Group'}]});
    const result=await createExamsRepository(client,'student').get('s',{studentView:true});
    assert.equal(!!result,['exam','quiz'].includes(kind),kind);
  }
});

test('truncated questions do not become a false exact count and query failures propagate', async () => {
  const { createExamsRepository } = load('server/repositories/exams.ts', { 'server-only': {}, '@/shared/contracts/exam-listing': listing });
  const tables={offering_assessments:[{id:'s',offering_id:'o',assessment_id:'a'}],
    assessments:[{id:'a',type:'quiz',title:'Quiz'}],course_offerings:[{id:'o',course_id:'c',name:'Group'}],
    assessment_questions:Array.from({length:501},()=>({assessment_id:'a'}))};
  const {client}=fakeClient(tables);const result=await createExamsRepository(client,'student').list({studentView:true});
  assert.equal(result.truncated,true);assert.equal(result.items[0].questionCount,null);
  await assert.rejects(createExamsRepository(fakeClient({}, {message:'private details'}).client,'student').list({studentView:true}),/Unable to load exams/);
});

test('read-only views show released marks only and expose no attempt-start action', () => {
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const views=load('frontend/features/exams/exams-list.tsx',{'react/jsx-runtime':require('react/jsx-runtime'),
    'next/link':p=>React.createElement('a',p),'lucide-react':require('lucide-react'),
    '@/shared/contracts/exam-listing':listing,'@/shared/utils':{cn:(...v)=>v.filter(Boolean).join(' ')}});
  const exam={id:'s',title:'Physics',kind:'quiz',offeringName:'Group',courseTitle:null,instructions:null,
    timeLimitSeconds:null,maxAttempts:2,questionCount:null,opensAt:null,closesAt:null,state:'SUBMITTED',
    attempts:[{attemptNumber:1,status:'submitted',score:987,maxScore:1000,startedAt:'2026-10-11T10:00:00Z'}]};
  const html=renderToStaticMarkup(React.createElement(views.ExamDetailView,{exam,isStaff:false}));
  assert.doesNotMatch(html,/987|Released mark:|<button|Start exam|Continue exam/);
  assert.match(html,/Question count unavailable/);
  const released=renderToStaticMarkup(React.createElement(views.ExamDetailView,{exam:{...exam,state:'GRADED',attempts:[{...exam.attempts[0],status:'graded'}]},isStaff:false}));
  assert.match(released,/987/);
});

test('missing identity redirects while load failures render a safe error, not an empty list', async () => {
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const components={ExamsErrorView:()=>React.createElement('p',null,'Safe error'),ExamsListView:()=>React.createElement('p',null,'Listing')};
  const page=service=>load('app/(dashboard)/_components/website-exams.tsx',{
    'react/jsx-runtime':require('react/jsx-runtime'),'next/navigation':{redirect:()=>{throw Error('sign-in redirect')},notFound:()=>{throw Error('not found')}},
    '@/frontend/features/exams/exams-list':components,'@/server/services/exams':service});
  await assert.rejects(page({loadExamList:async()=>null}).WebsiteExams(),/sign-in redirect/);
  const html=renderToStaticMarkup(await page({loadExamList:async()=>{throw Error('private error')}}).WebsiteExams());
  assert.match(html,/Safe error/);assert.doesNotMatch(html,/private error|Listing/);
});
