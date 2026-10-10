import { isFirebaseStaging } from '@/shared/auth-config';
import { getWebsiteContext } from '@/server/services/website';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getCourseIdentity } from '@/server/queries/catalog';

const CourseLayout = async ({
	children,
	params: paramsPromise,
}: {
	children: React.ReactNode;
	params: Promise<{ courseId: string }>;
}) => {
	const params = await paramsPromise;
	if (isFirebaseStaging()) {
        const context = await getWebsiteContext();
        if (!context) redirect('/sign-in');
        if (!/^[0-9a-f-]{36}$/i.test(params.courseId)) notFound();
        if (!(await context.repository.course(params.courseId)).length) notFound();
        return <>{children}</>;
    }
	const { userId } = await auth();

	if (!userId) {
		return redirect('/');
	}

	const course = await getCourseIdentity(params.courseId);

	if (!course) {
		return redirect('/');
	}

	return <>{children}</>;
};

export default CourseLayout;
