import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { getDbUser } from '@/server/services/user';
import { SubmissionsView } from '@/frontend/features/admin/submissions/submissions-view';

const AdminSubmissionsPage = async () => {
	const { userId } = await auth();

	if (!userId) {
		return redirect('/');
	}

	const dbUser = await getDbUser(userId);
	if (!dbUser || dbUser.role === 'STUDENT' || (dbUser.role as string) === 'student') {
		return redirect('/');
	}

	return <SubmissionsView />;
};

export default AdminSubmissionsPage;
