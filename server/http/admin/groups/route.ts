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
		const groups = await db.group.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				students: {
					include: {
						user: {
							select: {
								id: true,
								externalId: true,
								name: true,
								email: true,
								role: true,
								isApproved: true,
							},
						},
					},
				},
			},
		});

		const enrichedGroups = groups.map((g) => ({
			id: g.id,
			name: g.name,
			schedule: g.schedule,
			createdAt: g.createdAt,
			updatedAt: g.updatedAt,
			students: g.students.map((s) => ({
				id: s.id,
				userId: s.userId,
				groupId: s.groupId,
				user: {
					id: s.user?.id || s.userId,
					externalId: s.user?.externalId || s.userId,
					name: s.user?.name || 'Student',
					email: s.user?.email || '',
					imageUrl: '',
					role: s.user?.role?.toLowerCase() || 'student',
				},
			})),
		}));

		return NextResponse.json(enrichedGroups);
	} catch (error) {
		console.error('[GROUPS_GET]', error);
		return new NextResponse('Unable to load study groups.', { status: 500 });
	}
}

export async function POST(req: Request) {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const body = await req.json();
		const name = typeof body?.name === 'string' ? body.name.trim() : '';
		const schedule = Array.isArray(body?.schedule) ? body.schedule : [];

		if (!name) {
			return new NextResponse('A group name is required.', { status: 400 });
		}

		const existing = await db.group.findUnique({
			where: { name },
		});
		if (existing) {
			return new NextResponse('A group with this name already exists.', {
				status: 409,
			});
		}

		const group = await db.group.create({
			data: {
				name,
				schedule,
			},
		});

		return NextResponse.json(group, { status: 201 });
	} catch (error) {
		console.error('[GROUPS_POST]', error);
		return new NextResponse('Unable to create the study group.', { status: 500 });
	}
}

export async function PUT(req: Request) {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const body = await req.json();
		const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
		const groupId = typeof body?.groupId === 'string' ? body.groupId.trim() : '';

		if (!userId || !groupId) {
			return new NextResponse('A userId and groupId are required.', {
				status: 400,
			});
		}

		const group = await db.group.findUnique({
			where: { id: groupId },
		});
		if (!group) {
			return new NextResponse('Group not found.', { status: 404 });
		}

		// Resolve student from Prisma
		const targetUser = await db.user.findFirst({
			where: {
				OR: [{ id: userId }, { externalId: userId }],
			},
		});

		if (!targetUser) {
			return new NextResponse('Student not found in database.', { status: 404 });
		}

		const membership = await db.$transaction(async (tx) => {
			await tx.userGroup.deleteMany({ where: { userId: targetUser.id } });
			return tx.userGroup.create({
				data: {
					userId: targetUser.id,
					groupId: group.id,
				},
			});
		});

		return NextResponse.json(membership);
	} catch (error) {
		console.error('[GROUPS_ASSIGN]', error);
		return new NextResponse('Unable to assign the student to this group.', {
			status: 500,
		});
	}
}

export async function DELETE(req: Request) {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const groupId = searchParams.get('groupId')?.trim();
		const unassignUserId = searchParams.get('unassignUserId')?.trim();

		// Case 1: Unassign student from group
		if (unassignUserId) {
			const targetUser = await db.user.findFirst({
				where: {
					OR: [{ id: unassignUserId }, { externalId: unassignUserId }],
				},
			});
			if (targetUser) {
				await db.userGroup.deleteMany({ where: { userId: targetUser.id } });
			}
			return NextResponse.json({ success: true });
		}

		// Case 2: Delete entire group
		if (!groupId) {
			return new NextResponse('A groupId or unassignUserId is required.', {
				status: 400,
			});
		}

		await db.group.delete({
			where: { id: groupId },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('[GROUPS_DELETE]', error);
		return new NextResponse('Unable to delete this group or unassign student.', {
			status: 500,
		});
	}
}
