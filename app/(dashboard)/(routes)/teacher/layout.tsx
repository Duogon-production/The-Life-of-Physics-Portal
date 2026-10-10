import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDbUser } from '@/server/services/user';

const TeacherLayout = async ({ children }: { children: React.ReactNode }) => {
	const { userId } = await auth();
	if (!userId) return redirect('/');

	const dbUser = await getDbUser(userId);
	if (!dbUser || dbUser.role === 'STUDENT' || (dbUser.role as string) === 'student') {
		return redirect('/');
	}

	return <>{children}</>;
};

export default TeacherLayout;
