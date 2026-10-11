'use client';

import { UserButton as ClerkUserButton } from '@clerk/nextjs';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { isFirebaseStaging } from '@/shared/auth-config';
import { useApplicationAuth, useWebsiteNavigation } from './application-auth-provider';

/** Identity-only compatibility boundary. These hooks never infer authorization. */
export function useUser() {
  const { user } = useApplicationAuth();
  const navigation = useWebsiteNavigation();
  return { user: user ? { ...user, id: navigation?.viewer.id ?? user.id, primaryEmailAddress: { emailAddress: user.email } } : null };
}
export function useAuth() {
  const navigation = useWebsiteNavigation();
  const { user } = useApplicationAuth();
  return { userId: navigation?.viewer.id ?? user?.id ?? null };
}
export function useClerk() {
  const { signOut, openUserProfile } = useApplicationAuth();
  return { openUserProfile, signOut: async (_after?: unknown) => {
    try { await signOut(); }
    catch { toast.error('Sign-out could not be confirmed. Please retry.'); }
  } };
}
export function UserButton(props: React.ComponentProps<typeof ClerkUserButton>) {
  const { user, signOut } = useApplicationAuth();
  const [open, setOpen] = useState(false);
  if (!isFirebaseStaging()) return <ClerkUserButton {...props} />;
  return <div className="relative">
    <button type="button" aria-label="Your account" aria-expanded={open} onClick={() => setOpen(!open)}
      className={'h-9 w-9 rounded-full border-2 border-black shadow-hard-sm'}>
      {(user?.fullName || user?.email || 'L').slice(0, 1).toUpperCase()}
    </button>
    {open && <div className="absolute bottom-full left-0 z-[99999] mb-2 w-56 rounded-2xl border-2 border-black bg-white p-3 shadow-hard">
      <p className="break-words text-xs">{user?.email}</p>
      <button type="button" className="mt-3 text-sm font-bold" onClick={() => void signOut().catch(() => toast.error('Sign-out could not be confirmed. Please retry.'))}>Sign out</button>
    </div>}
  </div>;
}
