import Link from 'next/link';
import { isFirebaseStaging } from '@/shared/auth-config';
import { notFound } from 'next/navigation';

export default function UnavailablePage() {
  if (!isFirebaseStaging()) notFound();
  return <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold text-slate-900">This feature is awaiting integration</h1><p className="mt-4 text-sm text-slate-500">Course editing, homework, video playback, support tickets, live sessions, notifications, payments, personalization and notes are not available in this staging phase. Your existing records are preserved.</p><Link className="mt-6 inline-block font-semibold text-sky-700" href="/home">Return to Home</Link></div>;
}
