import { isFirebaseStaging } from '@/shared/auth-config';
import { getWebsiteContext } from '@/server/services/website';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDbUser } from '@/server/services/user';

const TeacherLayout = async ({ children }: { children: React.ReactNode }) => {
	if (isFirebaseStaging()) {
        const context = await getWebsiteContext();
        if (!context) redirect('/sign-in');
        if (!context.memberships.some(m => m.status === 'active') || !(context.courseStaff.length || context.offeringStaff.length || context.memberships.some(m => m.status === 'active' && ['owner','admin','teacher','assistant'].includes(m.role)))) redirect('/home');
        return <>{children}</>;
    }
	const { userId } = await auth();
	if (!userId) return redirect('/');

	const dbUser = await getDbUser(userId);
	if (!dbUser || dbUser.role === 'STUDENT' || (dbUser.role as string) === 'student') {
		return redirect('/');
	}

	return <>{children}</>;
};

export default TeacherLayout;
