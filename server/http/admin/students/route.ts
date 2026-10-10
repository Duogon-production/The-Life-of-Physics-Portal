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
		// Single source of truth: Fetch all approved students from Prisma
		const approvedStudents = await db.user.findMany({
			where: {
				isApproved: true,
				role: 'STUDENT',
			},
			include: {
				userGroups: {
					include: {
						group: {
							select: { id: true, name: true },
						},
					},
				},
			},
			orderBy: {
				name: 'asc',
			},
		});

		const students = approvedStudents.map((s) => ({
			id: s.id,
			externalId: s.externalId,
			name: s.name || 'Student',
			email: s.email,
			imageUrl: '',
			role: s.role.toLowerCase(),
			currentGroup: s.userGroups[0]?.group || null,
		}));

		return NextResponse.json(students);
	} catch (error) {
		console.error('[ADMIN_STUDENTS_GET_ERROR]', error);
		return new NextResponse('Internal Error', { status: 500 });
	}
}
