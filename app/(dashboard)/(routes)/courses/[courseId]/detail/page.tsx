import { isFirebaseStaging } from '@/shared/auth-config';
import LegacyCourseDetail from '@/frontend/features/courses/course-detail';
import { WebsiteCourse, type WebsiteSearch } from '../../../../_components/website-pages';
export default async function CourseDetail({ params, searchParams }: { params: Promise<{courseId:string}>; searchParams: Promise<WebsiteSearch> }) {
  if (isFirebaseStaging()) return <WebsiteCourse courseId={(await params).courseId} search={await searchParams} />;
  return <LegacyCourseDetail />;
}
