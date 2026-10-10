import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();
		const courseId = params.courseId;

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const ownCourse = await db.course.findUnique({
			where: { id: courseId, userId },
		});

		if (!ownCourse) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const lastChapter = await db.chapter.findFirst({
			where: { courseId },
			orderBy: { position: 'desc' },
		});

		const newPosition = lastChapter ? lastChapter.position + 1 : 1;

		const { title } = await req.json();

		const chapter = await db.chapter.create({
			data: {
				title,
				courseId,
				position: newPosition,
			},
		});

		return NextResponse.json(chapter);
	} catch (error) {
		console.log('[ERROR] POST /api/courses/[courseId]/chapters', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
