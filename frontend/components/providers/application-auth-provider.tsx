'use client';
import { createContext, useContext } from 'react';
import { useUser, useClerk, UserButton } from '@clerk/nextjs';
import { useFirebaseAuth } from '@/frontend/components/providers/firebase-auth-provider';
import { isFirebaseStaging } from '@/shared/auth-config';
import type { WebsiteNavigation } from '@/shared/contracts/application-auth';

type User = { id: string; lastName: string | null; imageUrl: string | null; firstName: string | null; username: string | null; fullName: string | null; email: string | null };
type State = { user: User | null; signOut: () => Promise<void>; openUserProfile: () => void };
const AuthContext = createContext<State | null>(null);
const NavigationContext = createContext<WebsiteNavigation | null>(null);

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { user } = useUser(); const clerk = useClerk();
  return <AuthContext.Provider value={{ user: user ? { id: user.id, lastName: user.lastName, imageUrl: user.imageUrl, firstName: user.firstName, username: user.username, fullName: user.fullName, email: user.primaryEmailAddress?.emailAddress || null } : null,
    openUserProfile: () => clerk.openUserProfile(), signOut: async () => { await clerk.signOut(); window.location.assign('/sign-in'); } }}>{children}</AuthContext.Provider>;
}
function FirebaseBridge({ children }: { children: React.ReactNode }) {
  const { user, logout } = useFirebaseAuth();
  return <AuthContext.Provider value={{ user: user ? { id: user.uid, lastName: null, imageUrl: user.photoURL, firstName: user.displayName?.split(' ')[0] || null, username: null, fullName: user.displayName, email: user.email } : null, signOut: logout, openUserProfile: () => { throw new Error("Profile editing is awaiting integration"); } }}>{children}</AuthContext.Provider>;
}
export function ApplicationAuthProvider({ children }: { children: React.ReactNode }) {
  return isFirebaseStaging() ? <FirebaseBridge>{children}</FirebaseBridge> : <ClerkBridge>{children}</ClerkBridge>;
}
export function useApplicationAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error('ApplicationAuthProvider required');
  return state;
}
export function WebsiteNavigationProvider({ value, children }: { value: WebsiteNavigation; children: React.ReactNode }) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
export const useWebsiteNavigation = () => useContext(NavigationContext);
export function ApplicationAvatar() {
  const { user } = useApplicationAuth();
  return isFirebaseStaging() ? <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-cyan-500 bg-cyan-50 text-cyan-800 font-bold">{(user?.fullName || user?.email || 'L').slice(0, 1).toUpperCase()}</span> :
    <UserButton appearance={{ elements: { avatarBox: 'h-9 w-9 border-2 border-cyan-500 shadow-sm', userButtonPopoverCard: 'shadow-xl rounded-2xl border border-slate-200 z-[99999] pointer-events-auto', userButtonPopoverMain: 'z-[99999] pointer-events-auto' } }} />;
}
