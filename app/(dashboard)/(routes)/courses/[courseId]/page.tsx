import { isFirebaseStaging } from '@/shared/auth-config';
import { WebsiteCourse, type WebsiteSearch } from '../../../_components/website-pages';
import { getCourseEntry } from '@/server/queries/catalog';
import { recordCourseView } from '@/server/services/course-statistics';
import { redirect } from 'next/navigation';

const CourseIdPage = async ({ params: paramsPromise, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<WebsiteSearch> }) => {
	const params = await paramsPromise;
	const courseId = params.courseId;
	if (isFirebaseStaging()) return <WebsiteCourse courseId={courseId} search={await searchParams} />;

	const course = await getCourseEntry(courseId);

	if (!course) return redirect('/');

	await recordCourseView(courseId, course.category?.id);

	if (course.chapters.length > 0) {
		return redirect(`/courses/${course.id}/chapters/${course.chapters[0].id}`);
	}

	return redirect(`/courses/${course.id}/detail`);
};

export default CourseIdPage;
