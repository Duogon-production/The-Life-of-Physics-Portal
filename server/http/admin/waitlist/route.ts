import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';
import { isAdminOrTeacher } from '@/server/services/teacher';

const requireStaffAccess = async () => {
	const { userId, sessionClaims } = await auth();
	return isAdminOrTeacher(userId, sessionClaims);
};

export async function GET() {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		// Single source of truth: Fetch all registered users in Prisma awaiting approval
		const users = await db.user.findMany({
			where: {
				isApproved: false,
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		return NextResponse.json({
			users,
			invitations: [],
		});
	} catch (error) {
		console.error('[WAITLIST_GET]', error);
		return new NextResponse('Unable to load the waitlist.', { status: 500 });
	}
}

export async function POST(req: Request) {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const { userId: adminExternalId } = await auth();
		const body = await req.json();

		const userId =
			typeof body?.userId === 'string'
				? body.userId.trim()
				: typeof body?.studentId === 'string'
				? body.studentId.trim()
				: '';

		if (!userId) {
			return new NextResponse('User ID is required for approval.', { status: 400 });
		}

		// Find user by id or externalId
		const targetUser = await db.user.findFirst({
			where: {
				OR: [{ id: userId }, { externalId: userId }],
			},
		});

		if (!targetUser) {
			return new NextResponse('User not found in system.', { status: 404 });
		}

		// Update Prisma: isApproved = true, approvedAt = new Date(), approvedBy = currentAdmin
		const updatedUser = await db.user.update({
			where: { id: targetUser.id },
			data: {
				isApproved: true,
				role: 'STUDENT',
				approvedAt: new Date(),
				approvedBy: adminExternalId || 'SYSTEM',
			},
		});

		return NextResponse.json({
			success: true,
			user: updatedUser,
		});
	} catch (error) {
		console.error('[WAITLIST_APPROVE_ERROR]', error);
		return new NextResponse('Unable to approve the student request.', {
			status: 500,
		});
	}
}

export async function DELETE(req: Request) {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const body = await req.json();
		const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';

		if (!userId) {
			return new NextResponse('User ID is required.', { status: 400 });
		}

		const targetUser = await db.user.findFirst({
			where: {
				OR: [{ id: userId }, { externalId: userId }],
			},
		});

		if (targetUser) {
			await db.user.delete({
				where: { id: targetUser.id },
			});
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('[WAITLIST_DELETE_ERROR]', error);
		return new NextResponse('Unable to reject/remove user from waitlist.', {
			status: 500,
		});
	}
}
