import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';

import { db } from '@/server/db';
import { isAdminOrTeacher } from '@/server/services/teacher';

const requireStaffAccess = async () => {
	const { userId, sessionClaims } = await auth();
	return isAdminOrTeacher(userId, sessionClaims);
};

// GET /api/admin/users - Returns Master User Directory of all platform users
export async function GET() {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const users = await db.user.findMany({
			include: {
				userGroups: {
					include: {
						group: {
							select: {
								id: true,
								name: true,
								schedule: true,
							},
						},
					},
				},
				_count: {
					select: {
						submissions: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		});

		const formattedUsers = users.map((u) => ({
			id: u.id,
			externalId: u.externalId,
			name: u.name || 'Unnamed Student',
			email: u.email,
			role: u.role,
			isApproved: u.isApproved,
			approvedAt: u.approvedAt,
			approvedBy: u.approvedBy,
			createdAt: u.createdAt,
			assignedGroups: u.userGroups.map((ug) => ug.group),
			currentGroupId: u.userGroups[0]?.group?.id || null,
			currentGroupName: u.userGroups[0]?.group?.name || null,
			submissionsCount: u._count.submissions,
		}));

		return NextResponse.json(formattedUsers);
	} catch (error) {
		console.error('[ADMIN_USERS_GET_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

// DELETE /api/admin/users?userId=... - 1-Tap Delete user from local database
export async function DELETE(req: Request) {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get('userId');

		if (!userId) {
			return new NextResponse('User ID is required', { status: 400 });
		}

		// Delete user from local Prisma database (cascades userGroups, submissions, etc.)
		await db.user.delete({
			where: { id: userId },
		});

		return NextResponse.json({ success: true, message: 'User deleted from database.' });
	} catch (error) {
		console.error('[ADMIN_USERS_DELETE_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}

// PATCH /api/admin/users - Toggle Approval or Manage Group Assignment
export async function PATCH(req: Request) {
	const { userId: adminUserId, sessionClaims } = await auth();
	if (!adminUserId || !(await isAdminOrTeacher(adminUserId, sessionClaims))) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const body = await req.json();
		const { userId, isApproved, groupId, role } = body;

		if (!userId) {
			return new NextResponse('User ID is required', { status: 400 });
		}

		const existingUser = await db.user.findUnique({
			where: { id: userId },
		});

		if (!existingUser) {
			return new NextResponse('User not found', { status: 404 });
		}

		const dataToUpdate: any = {};

		// 1. Handle Approval Status Toggle
		if (typeof isApproved === 'boolean') {
			dataToUpdate.isApproved = isApproved;
			dataToUpdate.approvedAt = isApproved ? new Date() : null;
			dataToUpdate.approvedBy = isApproved ? adminUserId : null;
		}

		// 2. Handle Role Update
		if (role && Object.values(Role).includes(role)) {
			dataToUpdate.role = role;
		}

		if (Object.keys(dataToUpdate).length > 0) {
			await db.user.update({
				where: { id: userId },
				data: dataToUpdate,
			});
		}

		// 3. Handle Group Assignment
		if (groupId !== undefined) {
			// Remove existing group memberships
			await db.userGroup.deleteMany({
				where: { userId },
			});

			// If a new group is selected, create group membership
			if (groupId && typeof groupId === 'string' && groupId !== 'NONE') {
				await db.userGroup.create({
					data: {
						userId,
						groupId,
					},
				});
			}
		}

		// Return refreshed user record
		const updated = await db.user.findUnique({
			where: { id: userId },
			include: {
				userGroups: {
					include: {
						group: true,
					},
				},
			},
		});

		return NextResponse.json({
			success: true,
			user: updated,
		});
	} catch (error) {
		console.error('[ADMIN_USERS_PATCH_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
