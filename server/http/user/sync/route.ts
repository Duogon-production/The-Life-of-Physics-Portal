import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { syncCurrentUser } from '@/server/services/user';

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ authenticated: false, user: null });
		}

		const user = await syncCurrentUser();
		return NextResponse.json({
			authenticated: true,
			user: user
				? {
						id: user.id,
						externalId: user.externalId,
						email: user.email,
						name: user.name,
						role: user.role,
						isApproved: user.isApproved,
				  }
				: null,
		});
	} catch (error) {
		console.error('[USER_SYNC_GET_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

export async function POST() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const user = await syncCurrentUser();
		return NextResponse.json({
			success: true,
			user: user
				? {
						id: user.id,
						externalId: user.externalId,
						email: user.email,
						name: user.name,
						role: user.role,
						isApproved: user.isApproved,
				  }
				: null,
		});
	} catch (error) {
		console.error('[USER_SYNC_POST_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
