import { isFirebaseStaging } from '@/shared/auth-config';
import { getChapter } from '@/server/queries/get-chapter';
import Banner from '@/frontend/components/banner';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import LessonTabs, { type LessonSegmentItem } from '@/frontend/features/courses/lesson/lesson-tabs';

const ChapterIdPage = async ({
	params: paramsPromise,
}: {
	params: Promise<{ courseId: string; chapterId: string }>;
}) => {
	const params = await paramsPromise;
	if (isFirebaseStaging()) return redirect('/unavailable');
	const { userId } = await auth();

	if (!userId) return redirect('/');

	const {
		chapter,
		course,
		muxData,
		attachments,
		nextChapter,
		userProgress,
		homeworkSubmission,
	} = await getChapter({
		userId,
		courseId: params.courseId,
		chapterId: params.chapterId,
	});

	if (!chapter || !course) return redirect('/');

	const completeOnEnd = !userProgress?.isCompleted;

	const segments: LessonSegmentItem[] = ((course as any).chapters || []).map(
		(c: any) => ({
			id: c.id,
			title: c.title,
			position: c.position,
			contentType: c.contentType,
			videoUrl: c.videoUrl,
			solutionVideoUrl: c.solutionVideoUrl,
			isCompleted: !!c.userProgresses?.[0]?.isCompleted,
		})
	);

	return (
		<div className="w-full">
			{userProgress?.isCompleted && (
				<div className="max-w-7xl mx-auto mb-4">
					<Banner
						variant={'success'}
						label="You have completed this segment."
					/>
				</div>
			)}

			<div className="mx-auto max-w-7xl">
				<LessonTabs
					attachments={attachments.map((attachment) => ({
						id: attachment.id,
						name: attachment.name,
						url: attachment.url,
					}))}
					chapterId={params.chapterId}
					chapterNumber={course.chapterNumber ?? chapter.position}
					chapterType="Chapter"
					courseTitle={course.title}
					completeOnEnd={completeOnEnd}
					courseId={params.courseId}
					description={chapter.description}
					hasSubmission={!!homeworkSubmission}
					reviewNote={null}
					submissionStatus={homeworkSubmission?.status ?? null}
					homeworkMode="FILE_UPLOAD"
					homeworkQuestions={[]}
					isCompleted={!!userProgress?.isCompleted}
					isWatched={!!userProgress?.isWatched}
					nextChapterId={nextChapter?.id}
					playbackId={muxData?.playbackId}
					videoUrl={chapter.videoUrl}
					solutionVideoUrl={chapter.solutionVideoUrl}
					contentType={chapter.contentType}
					title={chapter.title}
					userId={userId}
					segments={segments}
				/>
			</div>
		</div>
	);
};

export default ChapterIdPage;
