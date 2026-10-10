import type { StudentLesson } from '@/shared/contracts/dashboard';

type Scope = {
  courses: { id: string; title: string }[];
  offerings: { id: string; course_id: string; name: string }[];
  modules: { id: string; course_id: string }[];
  lessons: { id: string; module_id: string; title: string }[];
  progress: { offering_id: string; lesson_id: string; status: string }[];
};

/** Never merge progress across two runs of the same reusable course. */
export function studentLessons(scope: Scope): StudentLesson[] {
  return scope.offerings.flatMap(offering => {
    const course = scope.courses.find(c => c.id === offering.course_id);
    if (!course) return [];
    const moduleIds = new Set(scope.modules.filter(m => m.course_id === course.id).map(m => m.id));
    return [{ id: offering.id, title: `${course.title} · ${offering.name}`, chapterNumber: null,
      href: `/courses/${course.id}?offering=${offering.id}`,
      chapters: scope.lessons.filter(l => moduleIds.has(l.module_id)).map(l => ({ id: l.id, title: l.title,
        isCompleted: scope.progress.some(p => p.offering_id === offering.id && p.lesson_id === l.id && p.status === 'completed') })) }];
  });
}

export function validRosterPage(value?: string) {
  if (value === undefined) return 0;
  if (!/^\d{1,4}$/.test(value) || Number(value) > 1000) throw new Error('Invalid roster page');
  return Number(value);
}
