import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function DELETE(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; attachmentId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const ownCourse = await db.course.findUnique({
			where: { id: params.courseId, userId },
		});

		if (!ownCourse) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const attachment = await db.attachment.delete({
			where: { id: params.attachmentId, courseId: params.courseId },
		});

		return NextResponse.json(attachment);
	} catch (error) {
		console.log(
			'[ERROR] DELETE /api/courses/[courseId]/attachments/[attachmentId]',
			error
		);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
