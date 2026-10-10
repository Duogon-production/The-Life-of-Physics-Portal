# Legacy data migration preparation

Read-only inspection on 2026-10-10 found actual legacy data: 7 users, 4 courses,
8 chapters, 2 attachments, 4 UserProgress records, 2 groups, 4 group memberships,
1 homework submission, 2 support tickets and 1 personalization record. Other
Prisma models were empty. No personal data was printed or imported. Counts are
a snapshot, not proof that this is production or that records are disposable.

| Legacy model/field | Destination and decision |
| --- | --- |
| User.id / externalId | Stable profiles UUID plus private verified Clerk identity mapping; future Firebase subject maps to same UUID |
| User.role / approval | Explicit contextual organization/course/offering roles and enrollment statuses; never copy global ADMIN/TEACHER into a global profile role |
| Course / userId | Preserve valid course UUID; require explicit organization and author profile mapping; author uses a Clerk string ID |
| Category / CourseStatistic | Preserve/export; category taxonomy and analytics extension are not implemented in the new model |
| Chapter | Preserve valid lesson UUID; deterministic module UUID per legacy course; normalize positions and published status |
| Chapter description/video/solution/isFree/contentType | Individually ordered lesson blocks; explicit block/content access decisions; do not flatten solution and explanation into one field |
| Attachment / video URLs / MuxData | Preserve external references/keys and metadata; do not move bytes or imply existing UploadThing URLs have become private Supabase files |
| Group / schedule | Explicit group-to-offering definitions including course, tenant, Cairo timezone and dates; group names alone do not establish course membership; schedules need future live_sessions mapping |
| UserGroup | Explicit `(offering_id,stable profile UUID)` enrollments; duplicate destinations deduplicated; no inferred course enrollment |
| UserProgress / Progress | Resolve UUID-versus-Clerk-string identity, chapter and offering; reconcile the two progress sources explicitly; percentages are not authoritative completion |
| HomeworkSubmission (Prisma Submission) | Preserve original submission UUID, owner, chapter, status, timestamps, file and approval trail; design an explicit assignment/version/attempt mapping before import; approval is NOT a numeric grade |
| Note / GroupQuestion / SupportTicket / Personalization / Feedback | Preserve full source export; implement explicit tenant-scoped extension tables or retain legacy reads until mapped; never silently discard |

## Safe tooling

`node scripts/legacy-migration.cjs --inspect` loads local legacy configuration and
runs model counts inside a read-only PostgreSQL transaction with statement timeout.
It prints counts only. It never writes or switches a connection to Supabase.

`node scripts/legacy-migration.cjs snapshot.json mapping.json` validates an existing
private snapshot and reports counts, duplicate IDs/normalized emails, missing
references, explicit profile/organization/cohort mappings and deferred models.
There is deliberately no import/apply mode. `readyForImport` always remains false.
The exported `plan()` function returns a repeatable ID manifest for future importer
development; the command omits that manifest from logs to protect external subjects.
Generated module UUIDs use deterministic namespace hashing; existing valid course,
lesson and profile UUIDs are preserved through explicit maps.

Mapping input shape (use actual approved UUIDs, never these placeholders):

```json
{
  "profiles": { "legacy-user-uuid": "stable-profile-uuid" },
  "organizations": { "legacy-course-uuid": "organization-uuid" },
  "offerings": [{ "id": "offering-uuid", "course_id": "legacy-course-uuid" }],
  "groupOfferings": { "legacy-group-uuid": ["offering-uuid"] }
}
```

Snapshots use arrays keyed by Prisma delegate names: `user`, `course`, `chapter`,
`userGroup`, `submission`, etc. Keep source exports and mappings under ignored
`.local/` with restricted OS permissions and encrypted off-site copies. Export
through a trusted read-only operator process; no bulk personal-data exporter or
automatic email identity merger was introduced. Synthetic fixture tests validate
repeatability, duplicate enrollment suppression, missing references and explicit
homework deferral.

## Before executing an importer

Implement a durable migration-run/item ledger in a new reviewed migration; record
source record ID, destination ID, source checksum, phase and last error. Use unique
source keys and database transactions/upserts to resume without duplicate
enrollments/submissions/grades. Reject changed source records instead of overwriting
historical assessments. Capture a consistent source snapshot, reconcile all
deferred models, validate per-table counts and foreign keys, and compare grades and
file checksums. Rehearse restore and cutover rollback with a copy of real data.
Provision verified identity mappings before protected writes. No live cutover or
import is authorized by this preparation tool.
