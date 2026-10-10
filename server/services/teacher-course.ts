import 'server-only';
import { getSupabaseServerClient } from '@/server/integrations/supabase';
import { teacherCourseRepository } from '@/server/repositories/teacher-course';
export async function editableTeacherCourse(userId:string, courseId:string) {
  return teacherCourseRepository(await getSupabaseServerClient(),userId).editable(courseId);
}
