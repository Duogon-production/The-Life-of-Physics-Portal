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
  return { repository, isStaff };
}

export async function loadExamList() {
  const ctx = await examsContext();
  if (!ctx) return null;
  const result = await ctx.repository.list({ studentView: !ctx.isStaff });
  return { ...result, isStaff: ctx.isStaff };
}

export async function loadExam(scheduleId: string) {
  const ctx = await examsContext();
  if (!ctx) return null;
  const exam = await ctx.repository.get(scheduleId, { studentView: !ctx.isStaff });
  return { exam, isStaff: ctx.isStaff };
}
