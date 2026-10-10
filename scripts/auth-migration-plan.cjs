// Read-only inventory and stable UUID proposal. Contains no import/apply mode.
require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { models } = require('./legacy-migration.cjs');
async function main() {
  const db = new PrismaClient({ log: [] });
  try {
    const report = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const users = await tx.user.findMany({ orderBy: { id: 'asc' } });
      const fingerprints = {};
      for (const model of models) {
        const rows = await tx[model].findMany({ orderBy: { id: 'asc' } });
        fingerprints[model] = { count: rows.length, sha256: crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
      }
      return { mode: 'read-only-proposal', writes: 0, existingUsers: users.length, records: fingerprints,
        identities: users.map(user => ({ legacyUserId: user.id, proposedProfileId: user.id, clerkSubject: user.externalId,
          firebaseSubject: null, evidence: 'REQUIRED: authenticated proof of both accounts or reviewed provider export; email alone is insufficient',
          contextualPermissions: 'Unassigned until organization/course migration is approved' })) };
    }, { timeout: 20000 });
    fs.mkdirSync('.local', { recursive: true });
    const file = `.local/auth-migration-plan-${Date.now()}.json`;
    fs.writeFileSync(file, JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ existingUsers: report.existingUsers, writes: 0, privateReport: file,
      reconciliation: 'Run again and compare records fingerprints; differences require investigation before cutover.' }));
  } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Read-only identity inventory failed. No sensitive records logged.'); process.exitCode = 1; });
