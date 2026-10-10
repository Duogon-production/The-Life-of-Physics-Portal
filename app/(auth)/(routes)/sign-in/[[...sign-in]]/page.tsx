import { SignIn } from "@clerk/nextjs";
import { isFirebaseStaging } from '@/shared/auth-config';
import { FirebaseForm } from '@/frontend/features/auth/firebase-form';
 
export default function Page() {
  return isFirebaseStaging() ? <FirebaseForm /> : <SignIn />;
}
