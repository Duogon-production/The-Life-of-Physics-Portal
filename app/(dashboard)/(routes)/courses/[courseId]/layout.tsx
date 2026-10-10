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
