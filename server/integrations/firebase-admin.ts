import 'server-only';

import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/** Node runtime only. ADC or owner-configured credentials; never a browser import. */
export function getFirebaseAdminAuth() {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulator credentials are not accepted by this integration');
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase project is not configured');
  const name = 'lms-firebase';
  let app = getApps().find(value => value.name === name);
  if (!app) {
    const email = process.env.FIREBASE_CLIENT_EMAIL;
    const key = process.env.FIREBASE_PRIVATE_KEY;
    if (!!email !== !!key) throw new Error('Firebase Admin credentials are incomplete');
    app = initializeApp({ projectId, credential: email && key
      ? cert({ projectId, clientEmail: email, privateKey: key.replace(/\\n/g, '\n') })
      : applicationDefault() }, name);
  }
  return getAuth(app);
}
