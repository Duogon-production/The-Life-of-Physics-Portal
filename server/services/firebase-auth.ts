import 'server-only';

import { cookies } from 'next/headers';
import { getFirebaseAdminAuth } from '@/server/integrations/firebase-admin';
import { isFirebaseStaging } from '@/shared/auth-config';

export const firebaseCookie = process.env.NODE_ENV === 'production' ? '__Host-lms-firebase-id' : 'lms-firebase-id';

export async function verifyFirebaseToken(token: string) {
  if (!isFirebaseStaging()) throw new Error('Firebase staging is disabled');
  if (!token || token.length > 16000) throw new Error('Invalid token');
  const decoded = await getFirebaseAdminAuth().verifyIdToken(token, true);
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (decoded.aud !== project || decoded.iss !== `https://securetoken.google.com/${project}` ||
      !decoded.sub || decoded.uid !== decoded.sub || decoded.exp <= Date.now() / 1000) {
    throw new Error('Invalid token identity');
  }
  return decoded;
}

/** HttpOnly cookie holds a real, short-lived ID token, never a Firebase session cookie. */
export async function getFirebaseSession() {
  const token = (await cookies()).get(firebaseCookie)?.value;
  if (!token) return null;
  try { return { token, identity: await verifyFirebaseToken(token) }; }
  catch { return null; }
}

const provisioning = new Map<string, Promise<boolean>>();
export function provisionFirebaseClaim(uid: string): Promise<boolean> {
  const pending = provisioning.get(uid);
  if (pending) return pending;
  const operation = (async () => {
    const admin = getFirebaseAdminAuth();
    const user = await admin.getUser(uid);
    if (user.disabled) throw new Error('Account is disabled');
    const claims = user.customClaims ?? {};
    // Unexpected privileged API roles require an operator, never silently downgrade/accept.
    if (claims.role !== undefined && claims.role !== 'authenticated') throw new Error('Conflicting API role');
    if (claims.role === 'authenticated') return false;
    await admin.setCustomUserClaims(uid, { ...claims, role: 'authenticated' });
    return true;
  })();
  provisioning.set(uid, operation);
  void operation.finally(() => provisioning.delete(uid)).catch(() => {});
  return operation;
}
