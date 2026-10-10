import 'server-only';

import { createClerkClient } from '@clerk/backend';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';
import { isAdminOrTeacher } from '@/server/services/teacher';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const requireStaffAccess = async () => {
	const { userId, sessionClaims } = await auth();
	return isAdminOrTeacher(userId, sessionClaims);
};

export async function GET(
	req: Request,
	{ params: paramsPromise }: { params: Promise<{ studentId: string }> }
) {
	const params = await paramsPromise;
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	const { studentId } = params;
	if (!studentId) {
		return new NextResponse('Student ID is required', { status: 400 });
	}

	try {
		// 1. Resolve user in Prisma
		const dbUser = await db.user.findFirst({
			where: {
				OR: [{ id: studentId }, { externalId: studentId }],
			},
		});

		let clerkUser;
		const lookupClerkId = dbUser?.externalId || studentId;
		try {
			clerkUser = await clerk.users.getUser(lookupClerkId);
		} catch {
			// User might not be in Clerk or externalId differs
		}

		const resolvedUserId = dbUser ? dbUser.id : studentId;
		const progressUserId = dbUser ? dbUser.externalId : studentId;

		// 2. Fetch assigned group
		const userGroup = await db.userGroup.findFirst({
			where: {
				OR: [{ userId: resolvedUserId }, { userId: progressUserId }],
			},
			include: {
				group: true,
			},
		});

		// 3. Fetch homework submissions
		const homeworkSubmissions = await db.submission.findMany({
			where: {
				OR: [{ userId: resolvedUserId }, { userId: progressUserId }],
			},
			include: {
				chapter: {
					select: {
						id: true,
						title: true,
						position: true,
						course: {
							select: {
								id: true,
								title: true,
								chapterNumber: true,
							},
						},
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		// 4. Fetch overall lesson / chapter progress
		const courses = await db.course.findMany({
			where: { isPublished: true },
			include: {
				chapters: {
					where: { isPublished: true },
					select: {
						id: true,
						title: true,
						userProgresses: {
							where: {
								OR: [{ userId: resolvedUserId }, { userId: progressUserId }],
							},
							select: { isCompleted: true },
						},
					},
				},
			},
		});

		const totalCourses = courses.length;
		const completedCourses = courses.filter((c) =>
			c.chapters.length > 0 &&
			c.chapters.every((ch) => ch.userProgresses[0]?.isCompleted)
		).length;

		const totalChapters = courses.reduce((acc, c) => acc + c.chapters.length, 0);
		const completedChapters = courses.reduce(
			(acc, c) =>
				acc +
				c.chapters.filter((ch) => ch.userProgresses[0]?.isCompleted).length,
			0
		);

		const completionPercentage =
			totalCourses > 0
				? Math.round((completedCourses / totalCourses) * 100)
				: totalChapters > 0
				? Math.round((completedChapters / totalChapters) * 100)
				: 0;

		const studentDisplayName =
			dbUser?.name ||
			(clerkUser
				? `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() ||
				  clerkUser.username
				: 'Student') ||
			'Student';

		const studentEmail =
			dbUser?.email || clerkUser?.emailAddresses[0]?.emailAddress || '';

		return NextResponse.json({
			student: {
				id: resolvedUserId,
				externalId: progressUserId,
				name: studentDisplayName,
				email: studentEmail,
				imageUrl: clerkUser?.imageUrl || '',
				role: (dbUser?.role || 'STUDENT').toLowerCase(),
				createdAt: dbUser?.createdAt || clerkUser?.createdAt,
			},
			group: userGroup?.group || null,
			homeworkSubmissions,
			progress: {
				totalLessons: totalCourses,
				completedLessons: completedCourses,
				totalChapters,
				completedChapters,
				completionPercentage,
			},
		});
	} catch (error) {
		console.error('[STUDENT_PROFILE_GET]', error);
		return new NextResponse('Unable to load student summary', { status: 500 });
	}
}
