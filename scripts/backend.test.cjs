const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Run real backend functions against in-memory dependencies, without credentials
// or writes to the database. Type-only contracts disappear during transpilation.
function loadBackend(filename, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, console: { log() {}, error() {} },
    require(name) {
      if (name === 'server-only') return {};
      assert(Object.hasOwn(dependencies, name), `Unmocked dependency ${name}`);
      return dependencies[name];
    },
  }, { filename });
  return module.exports;
}

class NextResponse extends Response {
  static json(value) {
    return new NextResponse(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  }
}

function dashboard(findMany) {
  return loadBackend('server/queries/get-dashboard-courses.ts', {
    '@/server/db': { db: { course: { findMany } } },
  });
}

function endpoint(auth, queryDashboardCourses) {
  return loadBackend('server/http/courses/dashboard/route.ts', {
    '@clerk/nextjs/server': { auth },
    'next/server': { NextResponse },
    '@/server/queries/get-dashboard-courses': { queryDashboardCourses },
  });
}

test('dashboard groups complete, partial, untouched, and empty courses as before', async () => {
  const { queryDashboardCourses } = dashboard(async () => [
    { id: 'complete', chapters: [{ userProgresses: [{ isCompleted: true }] }] },
    { id: 'partial', chapters: [{ userProgresses: [{ isCompleted: true }] }, { userProgresses: [] }] },
    { id: 'untouched', chapters: [{ userProgresses: [] }] },
    { id: 'empty', chapters: [] },
  ]);
  const data = await queryDashboardCourses('student');
  assert.deepEqual(Array.from(data.completedCourses, course => [course.id, course.progress]), [['complete', 100]]);
  assert.deepEqual(Array.from(data.coursesInProgress, course => [course.id, course.progress]), [
    ['partial', 50], ['untouched', 0], ['empty', null],
  ]);
});

test('dashboard endpoint rejects anonymous requests before querying', async () => {
  let queried = false;
  const { GET } = endpoint(() => ({ userId: null }), async () => { queried = true; });
  const response = await GET(new Request('http://localhost/api/courses/dashboard'));
  assert.equal(response.status, 401);
  assert.equal(await response.text(), 'Unauthorized');
  assert.equal(queried, false);
});

test('dashboard endpoint passes the authenticated identity to the shared query', async () => {
  const payload = { completedCourses: [{ id: 'course', progress: 100 }], coursesInProgress: [] };
  const { GET } = endpoint(() => ({ userId: 'student' }), async userId => {
    assert.equal(userId, 'student');
    return payload;
  });
  const response = await GET(new Request('http://localhost/api/courses/dashboard'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), payload);
});

test('HTTP query failures remain 500 responses, while page helpers retain their fallback', async () => {
  const query = dashboard(async () => { throw new Error('Database unavailable'); });
  const { GET } = endpoint(() => ({ userId: 'student' }), query.queryDashboardCourses);
  const response = await GET(new Request('http://localhost/api/courses/dashboard'));
  assert.equal(response.status, 500);
  assert.equal(await response.text(), 'Internal Server Error');
  const fallback = await query.getDashboardCourses('student');
  assert.equal(fallback.completedCourses.length, 0);
  assert.equal(fallback.coursesInProgress.length, 0);
});
