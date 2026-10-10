import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { syncCurrentUser, getDbUser } from '@/server/services/user';

export async function GET() {
	try {
		const { userId } = await auth();
		if (!userId) {
			return NextResponse.json({ authenticated: false, user: null });
		}

		// Ensure user is synced with Prisma
		const user = await syncCurrentUser();
		if (!user) {
			return NextResponse.json({ authenticated: false, user: null });
		}

		return NextResponse.json({
			authenticated: true,
			user: {
				id: user.id,
				externalId: user.externalId,
				email: user.email,
				name: user.name,
				role: user.role,
				isApproved: user.isApproved,
			},
		});
	} catch (error) {
		console.error('[USER_STATUS_GET]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

export async function PATCH(req: Request) {
	try {
		const { userId } = await auth();
		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const body = await req.json();
		const name = typeof body?.name === 'string' ? body.name.trim() : '';

		if (!name || name.length < 2) {
			return new NextResponse('Please enter a valid full name.', { status: 400 });
		}

		const user = await getDbUser(userId);
		if (!user) {
			return new NextResponse('User not found.', { status: 404 });
		}

		const updatedUser = await db.user.update({
			where: { id: user.id },
			data: { name },
		});

		return NextResponse.json({
			success: true,
			user: {
				id: updatedUser.id,
				externalId: updatedUser.externalId,
				email: updatedUser.email,
				name: updatedUser.name,
				role: updatedUser.role,
				isApproved: updatedUser.isApproved,
			},
		});
	} catch (error) {
		console.error('[USER_STATUS_PATCH]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
