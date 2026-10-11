import { isFirebaseStaging } from '@/shared/auth-config';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { SupportView } from '@/frontend/features/support/support-view';

const SupportPage = async () => {
	if (isFirebaseStaging()) return redirect('/unavailable');
	const { userId } = await auth();
	if (!userId) return redirect('/');
	return <SupportView />;
};

export default SupportPage;
