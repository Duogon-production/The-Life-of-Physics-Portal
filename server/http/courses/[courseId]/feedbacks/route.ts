import 'server-only';

import { db } from '@/server/db';
import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		const user = await currentUser();

		const { content } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const feedback = await db.feedback.create({
			data: {
				content,
				courseId: params.courseId,
				userId,
				avatarUrl: user ? user.imageUrl : '',
				fullName: user ? `${user.firstName} ${user.lastName}` : '',
			},
		});

		return NextResponse.json(feedback);
	} catch (error) {
		console.log('ERROR IN POST FEEDBACK', error);

		return new NextResponse('Internal server error', { status: 500 });
	}
}

export async function GET(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string }> }
) {
	const params = await paramsPromise;
	const { userId } = await auth();

	if (!userId) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const feedback = await db.feedback.findMany({
			where: {
				courseId: params.courseId,
			},
		});

		return NextResponse.json(feedback);
	} catch (error) {
		console.log('ERROR IN GET FEEDBACK', error);

		return new NextResponse('Internal server error', { status: 500 });
	}
}
