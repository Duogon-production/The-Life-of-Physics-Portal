import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		const { chapterId, courseId } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		if (!chapterId) {
			return new NextResponse('Chapter ID is required', { status: 400 });
		}

		const userProgress = await db.userProgress.upsert({
			where: {
				userId_chapterId: {
					userId,
					chapterId,
				},
			},
			update: {
				isCompleted: true,
				isWatched: true,
			},
			create: {
				userId,
				chapterId,
				isCompleted: true,
				isWatched: true,
			},
		});

		return NextResponse.json({ success: true, userProgress });
	} catch (error) {
		console.error('[PROGRESS_COMPLETE_POST_ERROR]', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
