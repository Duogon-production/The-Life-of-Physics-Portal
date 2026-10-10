import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/contracts/database.types';
import { canEditTeacherCourse } from '@/shared/teacher-course';
export function teacherCourseRepository(client: SupabaseClient<Database>, userId: string) {
  return {
    async editable(id: string) {
      const result = await client.from('courses').select('id,organization_id,title,slug,description,status,visibility,updated_at').eq('id', id).maybeSingle();
      if (result.error) throw new Error('Course lookup failed');
      if (!result.data) return null;
      const course = result.data;
      const [membership,staff] = await Promise.all([
        client.from('organization_memberships').select('role,status').eq('organization_id',course.organization_id).eq('user_id',userId).maybeSingle(),
        client.from('course_staff').select('role').eq('course_id',id).eq('user_id',userId).maybeSingle(),
      ]);
      if (membership.error || staff.error) throw new Error('Permission lookup failed');
      return canEditTeacherCourse(membership.data,staff.data) ? course : null;
    },
    create: (input: {organization_id: string; title: string; slug: string}) =>
      client.rpc('create_teacher_course', {p_organization_id:input.organization_id,p_title:input.title,p_slug:input.slug}),
    organization: (input: {name:string;slug:string}) => client.rpc('create_organization',{p_name:input.name,p_slug:input.slug}),
    update: (id:string, revision:string, fields: Database['public']['Tables']['courses']['Update']) =>
      client.from('courses').update(fields).eq('id',id).eq('updated_at',revision).select('id').maybeSingle(),
  };
}
