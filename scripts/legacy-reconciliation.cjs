// Read-only, explicit unresolved mappings. No email matching or import mode.
require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const { PrismaClient } = require('@prisma/client');
const { models, stableId } = require('./legacy-migration.cjs');
async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const report = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const users = await tx.user.findMany({ select: { id: true, externalId: true, role: true } });
      const courses = await tx.course.findMany({ select: { id: true, userId: true } });
      const chapters = await tx.chapter.findMany({ select: { id: true, courseId: true, position: true } });
      const groups = await tx.group.findMany({ select: { id: true } });
      const memberships = await tx.userGroup.findMany({ select: { id: true, userId: true, groupId: true } });
      const progress = await tx.userProgress.findMany({ select: { id: true, userId: true, chapterId: true, isCompleted: true } });
      const counts = {};
      for (const model of models) counts[model] = await tx[model].count();
      return { mode: 'read-only-reconciliation', readyForImport: false, writes: 0, counts,
        users: users.map(u => ({ sourceId: u.id, clerkSubject: u.externalId, proposedProfileId: u.id, firebaseSubject: null,
          legacyRole: u.role, organizationId: null, contextualRole: null,
          blockers: ['Verified dual-account proof or reviewed immutable-subject export', 'Explicit tenant/course/offering role approval', 'Review collision with any already-onboarded Firebase profile'] })),
        courses: courses.map(c => ({ sourceId: c.id, proposedCourseId: c.id, sourceClerkAuthor: c.userId,
          proposedAuthorProfileId: users.find(u => u.externalId === c.userId)?.id || null, organizationId: null,
          proposedModuleId: stableId('legacy-course-module', c.id), blockers: ['Approve tenant and course staff', 'Review external media and publication/access rules'] })),
        chapters: chapters.map(c => ({ sourceId: c.id, proposedLessonId: c.id, courseId: c.courseId, position: c.position,
          blocker: 'Normalize unique nonnegative positions; map explanation/solution/files into separate blocks' })),
        groups: groups.map(g => ({ sourceId: g.id, courseOfferingIds: [], blockers: ['Choose the courses served by this group', 'Approve cohort dates, timezone and schedule-to-live-session mapping'] })),
        enrollments: memberships.map(m => ({ sourceMembershipId: m.id, proposedProfileId: m.userId, sourceGroupId: m.groupId,
          offeringIds: [], status: null, blocker: 'Resolve group offerings and approve enrollment statuses before expanding memberships' })),
        progress: progress.map(p => ({ sourceId: p.id, sourceUserId: p.userId,
          proposedProfileId: users.find(u => u.id === p.userId || u.externalId === p.userId)?.id || null,
          proposedLessonId: p.chapterId, completed: p.isCompleted, offeringId: null,
          blocker: 'Resolve the original cohort; never duplicate completion into every run' })),
        deferred: ['Homework: preserve source submission, file, status, reviewer and times; define assignment/version/attempt mapping without fabricating grades',
          'Attachments/video: preserve external identifiers; storage privacy does not change merely by registering metadata',
          'Support tickets and personalization: explicit tenant-scoped extensions needed',
          'Do not discard currently empty categories, notes, questions, feedback, analytics, Mux and alternate progress models'],
        executionGates: ['Explicit owner approval', 'Consistent encrypted source backup and tested restore', 'Approved identity and contextual role mappings',
          'Additive migration-run/item ledger and resumable importer', 'Dry-run counts, hashes, foreign keys and file checksums reconcile', 'Staging rehearsal and rollback'] };
    }, { timeout: 20000 });
    fs.mkdirSync('.local', { recursive: true });
    fs.writeFileSync('.local/legacy-reconciliation.json', JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ writes: 0, readyForImport: false, counts: report.counts, privateReport: '.local/legacy-reconciliation.json' }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Reconciliation failed; no private records logged.'); process.exitCode = 1; });
