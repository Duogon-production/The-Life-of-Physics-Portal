import 'server-only';

import { db } from '@/server/db';
import { getDbUser } from '@/server/services/user';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();
		const body = await req.json();
		const { fileUrl, fileSize, fileKey } = body;

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		if (typeof fileUrl !== 'string' || !fileUrl) {
			return new NextResponse('A homework file is required', { status: 400 });
		}

		const dbUser = await getDbUser(userId);
		if (!dbUser) {
			return new NextResponse('User not found in system.', { status: 404 });
		}

		const chapter = await db.chapter.findFirst({
			where: {
				id: params.chapterId,
				courseId: params.courseId,
				isPublished: true,
			},
		});

		if (!chapter) {
			return new NextResponse('Chapter not found', { status: 404 });
		}

		// Import helper functions
		const { extractUploadthingKey, checkAndPruneStorageIfNeeded, DEFAULT_ESTIMATED_FILE_SIZE } = await import('@/server/services/storage-cleanup');
		const resolvedKey = (typeof fileKey === 'string' && fileKey) ? fileKey : extractUploadthingKey(fileUrl);
		const resolvedSize = (typeof fileSize === 'number' && fileSize > 0) ? fileSize : DEFAULT_ESTIMATED_FILE_SIZE;

		// Automated storage check: if cap exceeded, purges oldest 50% uploads
		await checkAndPruneStorageIfNeeded().catch((err) =>
			console.error('[STORAGE_CLEANUP_CHECK_WARN]', err)
		);

		const submission = await db.submission.upsert({
			where: {
				userId_chapterId: {
					userId: dbUser.id,
					chapterId: params.chapterId,
				},
			},
			update: {
				fileUrl,
				fileKey: resolvedKey,
				fileSize: resolvedSize,
				status: 'PENDING_APPROVAL',
			},
			create: {
				userId: dbUser.id,
				chapterId: params.chapterId,
				fileUrl,
				fileKey: resolvedKey,
				fileSize: resolvedSize,
				status: 'PENDING_APPROVAL',
			},
		});

		return NextResponse.json(submission);
	} catch (error) {
		console.log('[ERROR] POST homework-submissions', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
