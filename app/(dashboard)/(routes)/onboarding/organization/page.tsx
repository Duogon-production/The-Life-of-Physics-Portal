import { isFirebaseStaging } from '@/shared/auth-config';
import { notFound } from 'next/navigation';
import { TeacherEditor } from '../../../_components/teacher-editor';
export default function OrganizationOnboarding() {
  if(!isFirebaseStaging()) notFound();
  return <TeacherEditor onboarding/>;
}
