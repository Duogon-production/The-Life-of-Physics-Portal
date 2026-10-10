import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { queryDashboardCourses } from '@/server/queries/get-dashboard-courses';

export async function GET(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) return new NextResponse('Unauthorized', { status: 401 });
		return NextResponse.json(await queryDashboardCourses(userId));
	} catch (error) {
		console.log('ERROR GET /api/courses/dashboard');
		return new NextResponse('Internal Server Error', { status: 500 });
	}
}
