import 'server-only';
import { readFileSync } from 'node:fs';

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
    let fileCredential;
    const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!email && credentialPath) {
      // A protected service-account file can sign locally. ADC's remote signer
      // otherwise needs signBlob IAM permissions even when this file has a key.
      let value;
      try { value = JSON.parse(readFileSync(credentialPath, 'utf8')); }
      catch { throw new Error('Configured Firebase Admin credential file is invalid'); }
      if (value.type === 'service_account') {
        if (value.project_id !== projectId || typeof value.client_email !== 'string' || typeof value.private_key !== 'string') {
          throw new Error('Firebase Admin credential does not match the configured project');
        }
        fileCredential = cert({ projectId, clientEmail: value.client_email, privateKey: value.private_key });
      }
    }
    app = initializeApp({ projectId, credential: email && key
      ? cert({ projectId, clientEmail: email, privateKey: key.replace(/\\n/g, '\n') })
      : fileCredential ?? applicationDefault() }, name);
  }
  return getAuth(app);
}
