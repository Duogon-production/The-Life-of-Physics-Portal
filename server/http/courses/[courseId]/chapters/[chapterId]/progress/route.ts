import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function PUT(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();
		const { isCompleted, isWatched } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		if (typeof isCompleted !== 'boolean' && typeof isWatched !== 'boolean') {
			return new NextResponse('A progress value is required', { status: 400 });
		}

		const progressData = {
			...(typeof isCompleted === 'boolean' ? { isCompleted } : {}),
			...(typeof isWatched === 'boolean' ? { isWatched } : {}),
		};

		const userProgress = await db.userProgress.upsert({
			where: {
				userId_chapterId: {
					userId,
					chapterId: params.chapterId,
				},
			},
			update: progressData,
			create: {
				userId,
				chapterId: params.chapterId,
				isCompleted: isCompleted ?? false,
				isWatched: isWatched ?? false,
			},
		});

		return NextResponse.json(userProgress);
	} catch (error) {
		console.log('[ERROR] PUT chapterId/progress', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
