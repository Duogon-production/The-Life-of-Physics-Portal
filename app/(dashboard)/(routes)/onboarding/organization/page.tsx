import { isFirebaseStaging } from '@/shared/auth-config';
import { notFound } from 'next/navigation';
export default function OrganizationOnboarding() {
  if(!isFirebaseStaging()) notFound();
  notFound();
}
