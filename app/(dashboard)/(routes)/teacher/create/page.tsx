import { isFirebaseStaging } from '@/shared/auth-config';
import LegacyCreate from '@/frontend/features/teacher/courses/create-form';
import { TeacherEditor } from '../../../_components/teacher-editor';
export default function CreatePage() {
  return isFirebaseStaging()?<TeacherEditor/>:<LegacyCreate/>;
}
