import { isFirebaseStaging } from '@/shared/auth-config';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { SupportView } from '@/frontend/features/support/support-view';
import { SupabaseSupportView } from '@/frontend/features/support/supabase-support-view';
import { getApplicationViewer } from '@/server/services/application-auth';

const SupportPage = async () => {
	if (isFirebaseStaging()) {
		if (!await getApplicationViewer()) return redirect('/sign-in');
		return <SupabaseSupportView />;
	}
	const { userId } = await auth();
	if (!userId) return redirect('/');
	return <SupportView />;
};

export default SupportPage;
