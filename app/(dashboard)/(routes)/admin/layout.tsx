import { auth } from '@clerk/nextjs/server';
import { isFirebaseStaging } from '@/shared/auth-config';
import { redirect } from 'next/navigation';
import { getDbUser } from '@/server/services/user';

const AdminLayout = async ({ children }: { children: React.ReactNode }) => {
 // Firebase routes are individually allowlisted and use contextual Supabase
 // adapters (the Homework inbox checks offering permissions itself).
 if (isFirebaseStaging()) return <>{children}</>;
	const { userId } = await auth();
	if (!userId) return redirect('/');

	const dbUser = await getDbUser(userId);
	if (!dbUser || dbUser.role === 'STUDENT' || (dbUser.role as string) === 'student') {
		return redirect('/');
	}

	return <>{children}</>;
};

export default AdminLayout;
