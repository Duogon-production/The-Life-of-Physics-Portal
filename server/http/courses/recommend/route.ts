import 'server-only';

import { db } from '@/server/db';
import { RecommendCourse } from '@/shared/contracts/courses';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const GET = async (req: Request) => {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const recommendedCourses: RecommendCourse[] = await db.courseStatistic.findMany({
			where: { course: { isPublished: true } },
			include: {
				course: true,
			},
			orderBy: { views: 'desc' },
			take: 4,
		});

		return NextResponse.json(recommendedCourses);
	} catch (error) {
		console.log('[ERROR] GET /api/courses/recommend', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
};

export { GET };
