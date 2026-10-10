import 'server-only';

import Mux from '@mux/mux-node';
import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const getMuxVideo = () => {
	const tokenId = process.env.MUX_TOKEN_ID;
	const tokenSecret = process.env.MUX_TOKEN_SECRET;

	if (!tokenId || !tokenSecret) {
		throw new Error('Mux credentials are not configured');
	}

	return new Mux(tokenId, tokenSecret).Video;
};

export async function DELETE(
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

		if (!chapter) {
			return new NextResponse('Not Found', { status: 404 });
		}

		const existingMuxData = await db.muxData.findFirst({
			where: {
				chapterId,
			},
		});

		if (existingMuxData) {
			const Video = getMuxVideo();

			await Video.Assets.del(existingMuxData.assetId);

			await db.muxData.delete({
				where: {
					id: existingMuxData.id,
				},
			});
		}

		const deletedChapter = await db.chapter.delete({
			where: { id: chapterId },
		});

		const publishedChaptersInCourse = await db.chapter.findMany({
			where: { courseId, isPublished: true },
		});

		if (publishedChaptersInCourse.length === 0) {
			await db.course.update({
				where: { id: courseId },
				data: { isPublished: false },
			});
		}

		return NextResponse.json(deletedChapter);
	} catch (error) {
		console.log(
			'[ERROR] DELETE /api/courses/[courseId]/chapters/[chapterId]',
			error
		);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}

export async function PATCH(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();
		const { courseId, chapterId } = params;

		const { isPublished, ...values } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const ownCourse = await db.course.findUnique({
			where: { id: courseId, userId },
		});

		if (!ownCourse) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const existingChapter = await db.chapter.findUnique({
			where: { id: chapterId, courseId },
		});

		if (!existingChapter) {
			return new NextResponse('Not Found', { status: 404 });
		}

		const videoUrlChanged =
			typeof values.videoUrl === 'string' &&
			values.videoUrl !== existingChapter.videoUrl;
		const existingMuxData = videoUrlChanged
			? await db.muxData.findFirst({ where: { chapterId } })
			: null;

		const chapter = await db.chapter.update({
			where: { id: chapterId, courseId },
			data: { ...values },
		});

		if (existingMuxData) {
			try {
				const Video = getMuxVideo();
				await Video.Assets.del(existingMuxData.assetId);
			} catch (error) {
				console.warn('[MUX_ASSET_CLEANUP]', error);
			}

			await db.muxData.delete({ where: { id: existingMuxData.id } });
		}

		return NextResponse.json(chapter);
	} catch (error) {
		console.log(
			'[ERROR] PATCH /api/courses/[courseId]/chapters/[chapterId]',
			error
		);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
