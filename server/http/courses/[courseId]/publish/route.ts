import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function PATCH(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		const { courseId } = params;

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const course = await db.course.findUnique({
			where: { id: courseId, userId },
			include: {
				chapters: {
					include: {
						muxData: true,
					},
				},
			},
		});

		if (!course) {
			return new NextResponse('Not Found', { status: 404 });
		}

		const hasPublishedChapter = course.chapters.some(
			(chapter) => chapter.isPublished
		);

		const hasValidChapterNumber =
			typeof course.chapterNumber === 'number' &&
			course.chapterNumber >= 1 &&
			course.chapterNumber <= 8;

		if (!course.title || !hasValidChapterNumber || !hasPublishedChapter) {
			return new NextResponse('Missing required fields', { status: 401 });
		}

		const publishedCourse = await db.course.update({
			where: { id: courseId, userId },
			data: { isPublished: true },
		});

		return NextResponse.json(publishedCourse);
	} catch (error) {
		console.log('[ERROR] PATCH /api/courses/[courseId]/publish', error);

		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
