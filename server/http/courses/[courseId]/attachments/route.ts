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
		const { url, chapterId, fileSize, fileKey } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const ownCourse = await db.course.findUnique({
			where: { id: params.courseId, userId },
		});

		if (!ownCourse) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		if (typeof url !== 'string' || !url || typeof chapterId !== 'string' || !chapterId) {
			return new NextResponse('A resource URL and chapter are required.', {
				status: 400,
			});
		}

		const chapter = await db.chapter.findUnique({
			where: {
				id: chapterId,
				courseId: params.courseId,
			},
		});

		if (!chapter) {
			return new NextResponse('Chapter not found.', { status: 404 });
		}

		const { extractUploadthingKey, checkAndPruneStorageIfNeeded, DEFAULT_ESTIMATED_FILE_SIZE } = await import('@/server/services/storage-cleanup');
		const resolvedKey = (typeof fileKey === 'string' && fileKey) ? fileKey : extractUploadthingKey(url);
		const resolvedSize = (typeof fileSize === 'number' && fileSize > 0) ? fileSize : DEFAULT_ESTIMATED_FILE_SIZE;

		await checkAndPruneStorageIfNeeded().catch((err) =>
			console.error('[STORAGE_CLEANUP_CHECK_ATTACHMENT_WARN]', err)
		);

		const attachment = await db.attachment.create({
			data: {
				url,
				name: url.split('/').pop() || 'lesson-resource',
				fileKey: resolvedKey,
				fileSize: resolvedSize,
				courseId: params.courseId,
				chapterId,
			},
		});

		return NextResponse.json(attachment);
	} catch (error) {
		console.log('[ERROR] PATCH /api/courses/[courseId]', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
