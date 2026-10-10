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
			include: {
				chapters: {
					include: {
						muxData: true,
					},
				},
			},
		});

		if (!course) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		for (const chapter of course.chapters) {
			if (chapter.muxData?.assetId) {
				await getMuxVideo().Assets.del(chapter.muxData.assetId);
			}
		}

		const deletedCourse = await db.course.delete({
			where: { id: courseId },
		});

		return NextResponse.json(deletedCourse);
	} catch (error) {
		console.log('[ERROR] DELETE /api/courses/[courseId]', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}

export async function PATCH(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();
		const { courseId } = params;
		const values = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const course = await db.course.update({
			where: { id: courseId, userId },
			data: { ...values },
		});

		return NextResponse.json(course);
	} catch (error) {
		console.log('[ERROR] PATCH /api/courses/[courseId]', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}

export async function GET(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const course = await db.course.findUnique({
			where: {
				id: params.courseId,
			},
			include: {
				chapters: {
					where: { isPublished: true },
					include: { userProgresses: { where: { userId } } },
					orderBy: { position: 'asc' },
				},
			},
		});

		if (!course) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		return NextResponse.json(course);
	} catch (error) {
		console.log('[ERROR] GET /api/courses/[courseId]', error);

		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
