# Authentication dependency inventory

Inspected before and during the Firebase staging implementation. The following
files retain Clerk authentication or the native Supabase identity adapter. Their
legacy routes remain on Clerk/Prisma by default and are blocked or redirected in
Firebase staging; they have not been silently switched to Firebase UID strings.
See [the implementation report](firebase-auth-integration.md) for the reviewed
identity boundary, private registry, profile FK transition and acceptance gaps.

Existing teacher/admin authorization lives in `server/services/teacher.ts` and
`server/services/user.ts`; that legacy role/email logic is not reused for Firebase
roles. Firebase permissions derive exclusively from contextual PostgreSQL rows.
The native Supabase fallback in `server/services/lms-staging.ts` still uses the
verified native auth user UUID; its Firebase branch resolves the mapping RPC.

Historical migrations retain auth.uid() source text unchanged. Migration 8 already
rewrote application functions and policies to private.current_app_user_id();
migration 12 replaces that seam with strict issuer/subject mapping. Storage's raw
owner_id intentionally stays the provider subject, while LMS foreign keys stay UUIDs.

## Current dependency files

- `app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx`
- `app/(auth)/(routes)/sign-up/[[...sign-up]]/page.tsx`
- `app/(dashboard)/(routes)/admin/layout.tsx`
- `app/(dashboard)/(routes)/admin/submissions/page.tsx`
- `app/(dashboard)/(routes)/admin/users/page.tsx`
- `app/(dashboard)/(routes)/channel/page.tsx`
- `app/(dashboard)/(routes)/courses/[courseId]/chapters/[chapterId]/page.tsx`
- `app/(dashboard)/(routes)/courses/[courseId]/detail/page.tsx`
- `app/(dashboard)/(routes)/courses/[courseId]/layout.tsx`
- `app/(dashboard)/(routes)/group/page.tsx`
- `app/(dashboard)/(routes)/home/page.tsx`
- `app/(dashboard)/(routes)/search/page.tsx`
- `app/(dashboard)/(routes)/self-learning/page.tsx`
- `app/(dashboard)/(routes)/teacher/analytics/page.tsx`
- `app/(dashboard)/(routes)/teacher/courses/[courseId]/chapters/[chapterId]/page.tsx`
- `app/(dashboard)/(routes)/teacher/courses/[courseId]/page.tsx`
- `app/(dashboard)/(routes)/teacher/courses/page.tsx`
- `app/(dashboard)/(routes)/teacher/layout.tsx`
- `app/(dashboard)/layout.tsx`
- `app/layout.tsx`
- `frontend/components/media-room.tsx`
- `frontend/components/navbar-routes.tsx`
- `frontend/components/sidebar.tsx`
- `frontend/components/support-modal.tsx`
- `frontend/components/waitlist-overlay.tsx`
- `frontend/features/courses/navigation/course-sidebar.tsx`
- `frontend/features/dashboard/sidebar-routes.tsx`
- `frontend/features/dashboard/student-home.tsx`
- `middleware.ts`
- `server/http/admin/groups/route.ts`
- `server/http/admin/students/[studentId]/route.ts`
- `server/http/admin/students/route.ts`
- `server/http/admin/submissions/route.ts`
- `server/http/admin/users/route.ts`
- `server/http/admin/waitlist/route.ts`
- `server/http/courses/[courseId]/attachments/[attachmentId]/route.ts`
- `server/http/courses/[courseId]/attachments/route.ts`
- `server/http/courses/[courseId]/chapters/[chapterId]/homework-submissions/route.ts`
- `server/http/courses/[courseId]/chapters/[chapterId]/notes/[noteId]/route.ts`
- `server/http/courses/[courseId]/chapters/[chapterId]/notes/route.ts`
- `server/http/courses/[courseId]/chapters/[chapterId]/progress/route.ts`
- `server/http/courses/[courseId]/chapters/[chapterId]/publish/route.ts`
- `server/http/courses/[courseId]/chapters/[chapterId]/route.ts`
- `server/http/courses/[courseId]/chapters/[chapterId]/unpublish/route.ts`
- `server/http/courses/[courseId]/chapters/reorder/route.ts`
- `server/http/courses/[courseId]/chapters/route.ts`
- `server/http/courses/[courseId]/feedbacks/route.ts`
- `server/http/courses/[courseId]/publish/route.ts`
- `server/http/courses/[courseId]/route.ts`
- `server/http/courses/[courseId]/unpublish/route.ts`
- `server/http/courses/dashboard/route.ts`
- `server/http/courses/recommend/route.ts`
- `server/http/courses/route.ts`
- `server/http/personalization/route.ts`
- `server/http/progress/complete/route.ts`
- `server/http/support/route.ts`
- `server/http/upload/check-limit/route.ts`
- `server/http/user/status/route.ts`
- `server/http/user/sync/route.ts`
- `server/integrations/uploadthing.ts`
- `server/services/lms-staging.ts`
- `server/services/user.ts`
