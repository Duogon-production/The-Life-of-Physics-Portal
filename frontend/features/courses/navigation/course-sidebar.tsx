import { auth } from '@clerk/nextjs/server';
import type { Chapter, Course, UserProgress } from '@/shared/contracts/courses';
import { redirect } from 'next/navigation';
import CourseSidebarItem from '@/frontend/features/courses/navigation/course-sidebar-item';
import CourseProgress from '@/frontend/components/course-progress';
import CourseSidebarItem3 from '@/frontend/features/courses/navigation/course-sidebar-item-3';

interface CourseSidebarProps {
	course: Course & {
		chapters: (Chapter & {
			userProgresses: UserProgress[] | null;
		})[];
	};
	progressCount: number;
}

const CourseSidebar = async ({ course, progressCount }: CourseSidebarProps) => {
	const { userId } = await auth();

	if (!userId) return redirect('/');

	return (
		<div className="flex h-full flex-col overflow-y-auto border-r border-physics-cyan/30 bg-physics-charcoal shadow-[6px_0_24px_rgba(0,0,0,0.18)]">
			<div className="flex flex-col border-b border-physics-cyan/20 p-8">
				<h1 className="font-semibold text-physics-white">{course.title}</h1>

				<div className="mt-10">
					<CourseProgress variant="success" value={progressCount} />
				</div>
			</div>

			<div className="flex flex-col w-full">
				<CourseSidebarItem3 courseId={course.id} label="Course Information" />

				{course.chapters.map((chapter) => (
					<CourseSidebarItem
						key={chapter.id}
						id={chapter.id}
						label={chapter.title}
						isCompleted={!!chapter.userProgresses?.[0]?.isCompleted}
						courseId={course.id}
					/>
				))}

			</div>
		</div>
	);
};

export default CourseSidebar;
