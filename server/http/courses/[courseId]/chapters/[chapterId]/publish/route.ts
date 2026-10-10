import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function PATCH(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		const { courseId, chapterId } = params;

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const ownCourse = await db.course.findUnique({
			where: { id: courseId, userId },
		});

		if (!ownCourse) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const chapter = await db.chapter.findUnique({
			where: { id: chapterId, courseId },
		});

		if (!chapter || !chapter.title) {
			return new NextResponse('Missing required fields', { status: 400 });
		}

		const publishedChapter = await db.chapter.update({
			where: { id: chapterId, courseId },
			data: { isPublished: true },
		});

		return NextResponse.json(publishedChapter);
	} catch (error) {
		console.log(
			'[ERROR] PATCH /api/courses/[courseId]/chapters/[chapterId]/publish',
			error
		);

		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
