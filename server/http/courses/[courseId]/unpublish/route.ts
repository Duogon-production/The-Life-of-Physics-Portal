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
		});

		if (!course) {
			return new NextResponse('Not Found', { status: 404 });
		}

		const unpublishedCourse = await db.course.update({
			where: { id: courseId, userId },
			data: { isPublished: false },
		});

		return NextResponse.json(unpublishedCourse);
	} catch (error) {
		console.log('[ERROR] PATCH /api/courses/[courseId]/unpublish', error);

		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
