import { z } from 'zod';
const title = z.string().trim().min(1).max(200);
const slug = z.string().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const organizationInput = z.object({ name: title, slug }).strict();
export const createCourseInput = z.object({ organization_id: z.string().uuid(), title, slug }).strict();
export const updateCourseInput = z.object({
  updated_at: z.string().datetime({ offset: true }), title: title.optional(), slug: slug.optional(),
  description: z.string().max(20000).nullable().optional(),
  status: z.enum(['draft','published','archived']).optional(),
  visibility: z.enum(['private','unlisted','public']).optional(),
}).strict().refine(value => Object.keys(value).length > 1);
export function canEditTeacherCourse(membership: {role: string; status: string} | null, staff: {role: string} | null) {
  return !!membership && membership.status === 'active' &&
    (['owner','admin'].includes(membership.role) || !!staff && ['owner','instructor','editor'].includes(staff.role));
}
