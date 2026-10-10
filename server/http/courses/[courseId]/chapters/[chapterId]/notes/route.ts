import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		const { chapterId } = params;

		const { content } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const note = await db.note.create({
			data: {
				content,
				chapterId,
				userId,
			},
		});

		return NextResponse.json(note);
	} catch (error) {
		console.log('[ERROR] POST chapterId/note', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}

export async function GET(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		const { chapterId } = params;

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const notes = await db.note.findMany({
			where: {
				userId,
				chapterId,
			},
		});

		return NextResponse.json(notes);
	} catch (error) {
		console.log('[ERROR] GET chapterId/note', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}

export async function PATCH(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
	const params = await paramsPromise;
	try {
		const { userId } = await auth();

		const { chapterId } = params;

		const { content, id } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const note = await db.note.update({
			where: {
				id,
				userId,
				chapterId,
			},
			data: {
				content,
			},
		});

		return NextResponse.json(note);
	} catch (error) {
		console.log('[ERROR] PATCH chapterId/note', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
