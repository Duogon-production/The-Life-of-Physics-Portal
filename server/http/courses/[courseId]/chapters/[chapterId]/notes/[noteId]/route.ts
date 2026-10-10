import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function DELETE(
	req: Request,
	{
		params: paramsPromise,
	}: { params: Promise<{ courseId: string; chapterId: string; noteId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		const { chapterId, noteId } = params;

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const note = await db.note.delete({
			where: {
				id: noteId,
				userId,
				chapterId,
			},
		});

		return NextResponse.json(note);
	} catch (error) {
		console.log(
			'[ERROR] DELETE /api/courses/[courseId]/chapters/[chapterId]/notes/[noteId]',
			error
		);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
