import type { SelfLearningChapter, StudentLesson } from '@/shared/contracts/dashboard';

type Scope = {
  courses: { id: string; title: string }[];
  modules: { id: string; course_id: string; title: string; position: number }[];
  lessons: { id: string; module_id: string; title: string; status: string }[];
  offerings: { id: string; course_id: string; name: string }[];
  progress: { offering_id: string; lesson_id: string; status: string }[];
};

/** V2 grouping keys must carry real IDs, never a shared module title/number. */
export function v2Chapters(scope: Scope, offeringId?: string): SelfLearningChapter[] {
  return scope.modules.map<SelfLearningChapter>((module, index) => ({
    id: `${offeringId ?? 'catalog'}:${module.id}`,
    type: 'Module', number: index + 1, title: module.title, subtitle: '', description: '',
    lessonCount: scope.lessons.filter(l => l.module_id === module.id && l.status === 'published').length,
    progressAvailable: Boolean(offeringId),
    lessons: scope.lessons.filter(l => l.module_id === module.id && l.status === 'published').map(lesson => {
      const status = offeringId ? scope.progress.find(p => p.offering_id === offeringId && p.lesson_id === lesson.id)?.status : undefined;
      return { id: lesson.id, href: null, title: lesson.title, chapterType: 'Module', chapterNumber: index + 1,
        description: null, imageUrl: null, partsCount: null,
        // This is a progress projection, not an invented video/segment record.
        chapters: offeringId ? [{ id: lesson.id, title: lesson.title, isCompleted: status === 'completed' }] : [],
        status: status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Open Lesson',
      };
    }),
  })).filter(module => module.lessons.length > 0);
}

export function v2StudentLessons(scope: Scope): StudentLesson[] {
  return scope.offerings.flatMap(offering => v2Chapters({ ...scope,
    modules: scope.modules.filter(m => m.course_id === offering.course_id),
  }, offering.id).flatMap(module => module.lessons.map(lesson => ({ ...lesson,
    id: `${offering.id}:${lesson.id}`, groupKey: module.id,
    href: `/courses/${offering.course_id}?offering=${offering.id}`,
  }))));
}
