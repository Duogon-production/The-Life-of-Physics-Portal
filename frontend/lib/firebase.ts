'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getFirebaseConfig } from '@/shared/auth-config';

let ready: Promise<void> | undefined;
export function getFirebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(getFirebaseConfig());
  return getAuth(app);
}
export function restoreFirebaseAuth() {
  const auth = getFirebaseAuth();
  ready ??= setPersistence(auth, browserLocalPersistence).then(() => auth.authStateReady());
  return ready;
}
