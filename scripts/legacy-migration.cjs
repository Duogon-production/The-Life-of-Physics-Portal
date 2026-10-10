// Read-only preparation tool. There is deliberately no import/apply mode.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const models = ['user', 'course', 'chapter', 'category', 'attachment', 'muxData', 'userProgress', 'progress', 'group', 'userGroup', 'submission', 'groupQuestion', 'supportTicket', 'note', 'personalization', 'feedback', 'courseStatistic'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function stableId(namespace, ...parts) {
  const hash = crypto.createHash('sha256').update(JSON.stringify([namespace, ...parts])).digest('hex');
  return `${hash.slice(0,8)}-${hash.slice(8,12)}-8${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`;
}
function plan(snapshot, mapping = {}) {
  const problems = [];
  const rows = name => snapshot[name] || [];
  const ids = {};
  for (const model of models) {
    ids[model] = new Set();
    for (const row of rows(model)) {
      if (!uuid.test(row.id) || ids[model].has(row.id)) problems.push(`${model}: invalid/duplicate ID`);
      ids[model].add(row.id);
    }
  }
  const usersByExternal = new Map();
  const emailSet = new Set();
  for (const user of rows('user')) {
    if (usersByExternal.has(user.externalId)) problems.push('user: duplicate external identity');
    usersByExternal.set(user.externalId, user);
    const email = String(user.email || '').trim().toLowerCase();
    if (!email || emailSet.has(email)) problems.push('user: missing/duplicate normalized email (never auto-link)');
    emailSet.add(email);
    if (!uuid.test(mapping.profiles?.[user.id] || '')) problems.push('user: explicit stable profile mapping required');
  }
  const ref = (table, id, label) => { if (!ids[table].has(id)) problems.push(`${label}: missing ${table} reference`); };
  for (const course of rows('course')) {
    if (!usersByExternal.has(course.userId)) problems.push('course: missing Clerk author identity');
    if (!uuid.test(mapping.organizations?.[course.id] || '')) problems.push('course: organization assignment required');
  }
  for (const chapter of rows('chapter')) ref('course', chapter.courseId, 'chapter');
  const enrollmentKeys = new Set();
  for (const membership of rows('userGroup')) {
    ref('user', membership.userId, 'userGroup'); ref('group', membership.groupId, 'userGroup');
    const destinations = mapping.groupOfferings?.[membership.groupId];
    if (!Array.isArray(destinations) || !destinations.length || destinations.some(id => !uuid.test(id))) {
      problems.push('group: explicit offering assignment required'); continue;
    }
    for (const offeringId of destinations) enrollmentKeys.add(`${offeringId}:${mapping.profiles?.[membership.userId]}`);
  }
  for (const offering of mapping.offerings || []) {
    ref('course', offering.course_id, 'offering');
    if (!uuid.test(offering.id)) problems.push('offering: invalid ID');
  }
  const offeringIds = new Set((mapping.offerings || []).map(row => row.id));
  for (const destinations of Object.values(mapping.groupOfferings || {})) for (const id of destinations) if (!offeringIds.has(id)) problems.push('group: offering definition missing');
  for (const table of ['userProgress', 'progress', 'submission']) {
    const seen = new Set();
    for (const row of rows(table)) {
      ref('chapter', row.chapterId, table);
      if (table === 'submission') ref('user', row.userId, table);
      else if (!usersByExternal.has(row.userId) && !ids.user.has(row.userId)) problems.push(`${table}: unknown user identity`);
      const key = `${row.userId}:${row.chapterId}`;
      if (seen.has(key)) problems.push(`${table}: duplicate user/chapter`);
      seen.add(key);
    }
  }
  // Destination assignment alone is not an import-ready proof. Homework has no
  // equivalent historical assessment/grade mapping; progress has no cohort ID.
  const deferred = models.filter(name => !['user', 'course', 'chapter', 'group', 'userGroup'].includes(name))
    .filter(name => rows(name).length).map(name => ({ model: name, records: rows(name).length, action: 'archive and explicitly map before cutover' }));
  const manifest = {
    profiles: rows('user').map(u => ({ legacyId: u.id, profileId: mapping.profiles?.[u.id] || null, provider: 'clerk', subject: u.externalId })),
    courses: rows('course').map(c => ({ legacyId: c.id, courseId: c.id, organizationId: mapping.organizations?.[c.id] || null, moduleId: stableId('legacy-course-module', c.id) })),
    lessons: rows('chapter').map(c => ({ legacyId: c.id, lessonId: c.id, courseId: c.courseId })),
    enrollmentKeys: [...enrollmentKeys].sort(),
  };
  return { mode: 'dry-run', writes: 0, readyForImport: false, mappingValid: !problems.length, counts: Object.fromEntries(models.map(name => [name, rows(name).length])), problems, deferred, manifest };
}
async function inspect() {
  require('@next/env').loadEnvConfig(process.cwd());
  const { PrismaClient } = require('@prisma/client');
  const db = new PrismaClient({ log: [] });
  try {
    return await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '5s'");
      const counts = {};
      for (const name of models) counts[name] = await tx[name].count();
      return { mode: 'read-only-counts', counts };
    }, { timeout: 20000 });
  } finally { await db.$disconnect(); }
}
if (require.main === module) {
  (async () => {
    if (process.argv.includes('--inspect')) return console.log(JSON.stringify(await inspect(), null, 2));
    const [snapshotFile, mappingFile] = process.argv.slice(2);
    if (!snapshotFile) throw new Error('Usage: node scripts/legacy-migration.cjs --inspect OR snapshot.json mapping.json');
    const result = plan(JSON.parse(fs.readFileSync(path.resolve(snapshotFile), 'utf8')), mappingFile ? JSON.parse(fs.readFileSync(path.resolve(mappingFile), 'utf8')) : {});
    // Console report omits all external identity subjects and record IDs.
    const { manifest, ...report } = result;
    console.log(JSON.stringify(report, null, 2));
    if (result.problems.length) process.exitCode = 1;
  })().catch(() => { console.error('Read-only migration inspection failed. Check connectivity/input files locally; no records were written.'); process.exitCode = 1; });
}
module.exports = { plan, stableId };
