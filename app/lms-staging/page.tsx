import { redirect } from 'next/navigation';
import { isFirebaseStaging } from '@/shared/auth-config';
import { getFirebaseSession } from '@/server/services/firebase-auth';
import { getStagingLmsRepository } from '@/server/services/lms-staging';
import { FirebaseAccount } from '@/frontend/features/auth/firebase-account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export default async function StagingLmsPage() {
  if (!isFirebaseStaging()) redirect('/sign-in');
  const session = await getFirebaseSession();
  if (!session || !session.identity.email_verified || session.identity.role !== 'authenticated') redirect('/sign-in');
  try {
    const repository = await getStagingLmsRepository();
    const organizations = await repository.organizations();
    return <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold">The Life of Physics</h1><FirebaseAccount /></header>
      <h2 className="text-xl">Your learning organizations</h2>
      {!organizations.length && <p>Your account is ready. Your teacher will arrange access to your course group.</p>}
      {await Promise.all(organizations.map(async organization => {
        const courses = await repository.courses(organization.id);
        return <section key={organization.id} className="rounded-xl border bg-white p-6">
          <h3 className="text-lg font-semibold">{organization.name}</h3>
          {await Promise.all(courses.map(async course => {
            const offerings = await repository.offerings(course.id);
            return <div className="mt-4" key={course.id}><h4 className="font-medium">{course.title}</h4><ul className="mt-2 list-inside list-disc">{offerings.map(offering => <li key={offering.id}>{offering.name}</li>)}</ul></div>;
          }))}
        </section>;
      }))}
    </main>;
  } catch {
    return <main className="mx-auto max-w-3xl p-10 space-y-4"><h1 className="text-2xl">The Life of Physics</h1><FirebaseAccount /><p role="alert">Learning access is unavailable. Please sign in again or contact support.</p></main>;
  }
}
