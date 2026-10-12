import 'server-only';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import { createExamsRepository } from '@/server/repositories/exams';
import { getWebsiteContext, offeringCapability } from '@/server/services/website';

/**
 * Firebase/Supabase-mode exam reads (Delivery 1, read-only).
 * Identity: verified Firebase session via getWebsiteContext(). Data: caller JWT + RLS.
 * Returns null when there is no authenticated viewer (the page redirects to sign-in).
 */
async function examsContext() {
  const context = await getWebsiteContext();
  if (!context) return null;
  const repository = createExamsRepository(await getSupabaseServerClient(), context.viewer.id);
  // Staff = offering capability over at least one offering (narrower than the layout's course-or-offering test).
  const courses = await context.repository.courses();
  const offerings = await context.repository.offerings(courses.map(c => c.id));
  const isStaff = offerings.some(o => {
    const course = courses.find(c => c.id === o.course_id);
    return !!course && offeringCapability(context, course, o.id);
  });
  return { repository, isStaff, context, courses, offerings };
}

export async function loadExamList() {
  const ctx = await examsContext();
  if (!ctx) return null;
  const result = await ctx.repository.list({ studentView: !ctx.isStaff });
  const authoringOfferings=ctx.offerings.filter(o=>{const c=ctx.courses.find(c=>c.id===o.course_id);if(!c)return false;const member=ctx.context.memberships.find(m=>m.organization_id===c.organization_id&&m.status==='active');if(!member)return false;const admin=['owner','admin'].includes(member.role),staff=ctx.context.courseStaff.find(s=>s.course_id===c.id);const edits=admin||!!staff&&['owner','instructor','editor'].includes(staff.role);const manages=admin||!!staff&&['owner','instructor'].includes(staff.role)||ctx.context.offeringStaff.some(s=>s.offering_id===o.id&&s.role==='instructor');return edits&&manages;}).map(o=>({id:o.id,name:o.name,courseTitle:ctx.courses.find(c=>c.id===o.course_id)!.title}));
  return { ...result, isStaff: ctx.isStaff, authoringOfferings };
}

export async function loadExam(scheduleId: string) {
  const ctx = await examsContext();
  if (!ctx) return null;
  const exam = await ctx.repository.get(scheduleId, { studentView: !ctx.isStaff });
  const offering = ctx.offerings.find(o => o.id === exam?.offeringId);
  const course = ctx.courses.find(c => c.id === offering?.course_id);
  const membership=course?ctx.context.memberships.find(m=>m.organization_id===course.organization_id&&m.status==='active'):undefined;
  const assigned=course?ctx.context.courseStaff.find(s=>s.course_id===course.id):undefined;
  const admin=!!membership&&['owner','admin'].includes(membership.role);
  const canAuthor=!!course&&!!offering&&!!membership&&(admin||!!assigned&&['owner','instructor','editor'].includes(assigned.role))&&(admin||!!assigned&&['owner','instructor'].includes(assigned.role)||ctx.context.offeringStaff.some(s=>s.offering_id===offering.id&&s.role==='instructor'));
  return { exam, canAuthor, isStaff: !!course && !!offering && offeringCapability(ctx.context, course, offering.id) };
}
