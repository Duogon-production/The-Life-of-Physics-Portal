import 'server-only';

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
	getStorageUsage,
	checkAndPruneStorageIfNeeded,
} from '@/server/services/storage-cleanup';
import { isAdminOrTeacher } from '@/server/services/teacher';

// GET /api/upload/check-limit - Returns current platform storage consumption
export async function GET() {
	try {
		const usage = await getStorageUsage();
		return NextResponse.json(usage);
	} catch (error) {
		console.error('[UPLOAD_CHECK_LIMIT_GET_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

// POST /api/upload/check-limit - Triggers automatic check & 50% oldest file purge if above threshold
export async function POST(req: Request) {
	try {
		let force = false;
		try {
			const body = await req.json();
			force = Boolean(body?.force);
		} catch {
			// Body is optional
		}

		// If force requested, ensure user is admin/teacher
		if (force) {
			const { userId, sessionClaims } = await auth();
			if (!userId || !(await isAdminOrTeacher(userId, sessionClaims))) {
				return new NextResponse('Unauthorized to force storage purge', { status: 401 });
			}
		}

		const result = await checkAndPruneStorageIfNeeded(force);
		return NextResponse.json(result);
	} catch (error) {
		console.error('[UPLOAD_CHECK_LIMIT_POST_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
