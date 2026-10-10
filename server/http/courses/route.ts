import 'server-only';

import { db } from '@/server/db';
import { isTeacher } from '@/server/services/teacher';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	try {
		const { userId } = await auth();
		const { title } = await req.json();

		if (!userId || !(await isTeacher(userId))) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const course = await db.course.create({
			data: {
				title,
				userId,
			},
		});

		return NextResponse.json(course);
	} catch (error) {
		console.log('[Courses] Error: ', error);
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
