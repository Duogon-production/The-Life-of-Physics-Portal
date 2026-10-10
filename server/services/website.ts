import 'server-only';
import { cache } from 'react';
import { getApplicationViewer } from '@/server/services/application-auth';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import { createWebsiteRepository } from '@/server/repositories/website';
import { isFirebaseStaging } from '@/shared/auth-config';

export const getWebsiteContext = cache(async () => {
  if (!isFirebaseStaging()) throw new Error('Firebase staging required');
  const viewer = await getApplicationViewer();
  if (!viewer) return null;
  const repository = createWebsiteRepository(await getSupabaseServerClient(), viewer.id);
  const [organizations, memberships, courseStaff, offeringStaff] = await Promise.all([
    repository.organizations(), repository.memberships(), repository.courseStaff(), repository.offeringStaff(),
  ]);
  return { viewer, repository, organizations, memberships, courseStaff, offeringStaff };
});

export type WebsiteContext = NonNullable<Awaited<ReturnType<typeof getWebsiteContext>>>;

export function courseCapability(context: Pick<WebsiteContext, 'memberships' | 'courseStaff'>, course: { id: string; organization_id: string }) {
  const membership = context.memberships.find(m => m.organization_id === course.organization_id && m.status === 'active');
  const staff = context.courseStaff.find(s => s.course_id === course.id);
  return !!membership && (['owner', 'admin'].includes(membership.role) || !!staff);
}

export function offeringCapability(context: Pick<WebsiteContext, 'memberships' | 'courseStaff' | 'offeringStaff'>, course: { id: string; organization_id: string }, offeringId: string) {
  const membership = context.memberships.find(m => m.organization_id === course.organization_id && m.status === 'active');
  if (!membership) return false;
  return ['owner', 'admin'].includes(membership.role) || context.courseStaff.some(s => s.course_id === course.id && ['owner', 'instructor'].includes(s.role)) || context.offeringStaff.some(s => s.offering_id === offeringId);
}

export async function loadWebsiteScope(context: WebsiteContext, organizationId?: string, courseId?: string) {
  if (organizationId && !context.organizations.some(o => o.id === organizationId)) return null;
  const courseRows = courseId ? await context.repository.course(courseId) : await context.repository.courses(organizationId);
  const courses = courseRows.slice(0, 100);
  const [offeringRows, moduleRows, enrollmentRows] = await Promise.all([
    context.repository.offerings(courses.map(c => c.id)), context.repository.modules(courses.map(c => c.id)), context.repository.myEnrollments(),
  ]);
  const offerings = offeringRows.slice(0, 100), modules = moduleRows.slice(0, 500);
  const [lessonRows, progressRows, scheduledRows] = await Promise.all([
    context.repository.lessons(modules.map(m => m.id)), context.repository.progress(offerings.map(o => o.id)), context.repository.scheduledAssessments(offerings.map(o => o.id)),
  ]);
  const scheduled = scheduledRows.slice(0, 100);
  const assessments = await context.repository.assessments(Array.from(new Set(scheduled.map(a => a.assessment_id))));
  return { courses, offerings, modules, lessons: lessonRows.slice(0, 500), progress: progressRows.slice(0, 1000),
    enrollments: enrollmentRows.slice(0, 100), scheduled, assessments,
    limited: courseRows.length > 100 || offeringRows.length > 100 || moduleRows.length > 500 || enrollmentRows.length > 100 || lessonRows.length > 500 || progressRows.length > 1000 || scheduledRows.length > 100 || assessments.length > 100 };
}
