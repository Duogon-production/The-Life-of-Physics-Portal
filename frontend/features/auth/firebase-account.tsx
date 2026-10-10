'use client';
import { useState } from 'react';
import { useFirebaseAuth } from '@/frontend/components/providers/firebase-auth-provider';

export function FirebaseAccount() {
  const { user, loading, logout } = useFirebaseAuth();
  const [error, setError] = useState('');
  return <div className="flex items-center gap-4 text-sm">
    <span>{loading ? 'Restoring session…' : user?.displayName || user?.email}</span>
    <button onClick={() => void logout().catch(() => { setError('Signed out locally. Server revocation could not be confirmed; retry sign-in and logout.'); })} className="rounded-lg border px-4 py-2">Sign out</button>
    {error && <p role="alert">{error}</p>}
  </div>;
}
