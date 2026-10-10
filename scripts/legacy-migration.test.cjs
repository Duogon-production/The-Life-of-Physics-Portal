const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plan, stableId } = require('./legacy-migration.cjs');
const id = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const snapshot = { user: [{ id: id(1), externalId: 'clerk_string_uid', email: 'synthetic@example.invalid' }], course: [{ id: id(2), userId: 'clerk_string_uid' }], chapter: [{ id: id(3), courseId: id(2) }], group: [{ id: id(4) }], userGroup: [{ id: id(5), userId: id(1), groupId: id(4) }] };
const mapping = { profiles: { [id(1)]: id(1) }, organizations: { [id(2)]: id(6) }, offerings: [{ id: id(7), course_id: id(2) }], groupOfferings: { [id(4)]: [id(7), id(7)] } };
test('legacy plan is repeatable and deduplicates enrollment keys without writes', () => {
  const first = plan(snapshot, mapping);
  assert.deepEqual(first, plan(snapshot, mapping));
  assert.equal(first.mappingValid, true); assert.equal(first.writes, 0);
  assert.equal(first.readyForImport, false); assert.equal(first.manifest.enrollmentKeys.length, 1);
  assert.equal(first.manifest.profiles[0].subject, 'clerk_string_uid');
  assert.equal(stableId('module', id(2)), stableId('module', id(2)));
});
test('legacy plan rejects duplicate IDs, missing foreign keys and unmapped identities', () => {
  const result = plan({ ...snapshot, chapter: [{ id: id(3), courseId: id(99) }, { id: id(3), courseId: id(2) }] });
  assert.equal(result.mappingValid, false);
  assert.ok(result.problems.some(x => x.includes('duplicate ID')));
  assert.ok(result.problems.some(x => x.includes('missing course')));
  assert.ok(result.problems.some(x => x.includes('stable profile mapping')));
});
test('legacy homework stays explicitly deferred rather than fabricated assessment grades', () => {
  const result = plan({ ...snapshot, submission: [{ id: id(8), userId: id(1), chapterId: id(3) }] }, mapping);
  assert.equal(result.mappingValid, true); assert.equal(result.deferred[0].model, 'submission');
});
