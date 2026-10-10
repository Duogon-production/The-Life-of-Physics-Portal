import 'server-only';

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

import { db } from '@/server/db';
import { isAdminOrTeacher } from '@/server/services/teacher';

const reviewableStatuses = ['APPROVED', 'PENDING_APPROVAL'] as const;
type ReviewableStatus = (typeof reviewableStatuses)[number];

const isReviewableStatus = (value: unknown): value is ReviewableStatus =>
	typeof value === 'string' &&
	reviewableStatuses.includes(value as ReviewableStatus);

const requireStaffAccess = async () => {
	const { userId, sessionClaims } = await auth();
	if (!(await isAdminOrTeacher(userId, sessionClaims))) return null;
	return userId;
};

export async function GET(req: Request) {
	if (!(await requireStaffAccess())) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const { searchParams } = new URL(req.url);
		const groupId = searchParams.get('groupId')?.trim();
		const chapterId = searchParams.get('chapterId')?.trim();
		const status = searchParams.get('status')?.trim();

		let studentIds: string[] | undefined;
		if (groupId) {
			const group = await db.group.findUnique({ where: { id: groupId } });
			if (!group) {
				return new NextResponse('Group not found.', { status: 404 });
			}

			const memberships = await db.userGroup.findMany({
				where: { groupId },
				select: { userId: true },
			});
			studentIds = memberships.map((membership) => membership.userId);
		}

		const [submissions, allGroups, allChapters] = await Promise.all([
			db.submission.findMany({
				where: {
					...(chapterId ? { chapterId } : {}),
					...(status && isReviewableStatus(status) ? { status } : {}),
					...(studentIds ? { userId: { in: studentIds } } : {}),
				},
				include: {
					user: {
						select: {
							id: true,
							externalId: true,
							name: true,
							email: true,
						},
					},
					chapter: {
						select: {
							id: true,
							title: true,
							position: true,
							course: {
								select: { id: true, title: true, chapterNumber: true },
							},
						},
					},
				},
				orderBy: { createdAt: 'desc' },
			}),
			db.group.findMany({
				select: { id: true, name: true },
				orderBy: { name: 'asc' },
			}),
			// Strictly homework assignment segments only
			db.chapter.findMany({
				where: {
					isPublished: true,
					contentType: 'HOMEWORK_ASSIGNMENT',
				},
				select: {
					id: true,
					title: true,
					position: true,
					contentType: true,
					course: { select: { title: true, chapterNumber: true } },
				},
				orderBy: [{ position: 'asc' }],
			}),
		]);

		// Map group memberships
		const userGroups = await db.userGroup.findMany({
			include: { group: { select: { id: true, name: true } } },
		});
		const groupMap = new Map(userGroups.map((ug) => [ug.userId, ug.group]));

		const enrichedSubmissions = submissions.map((sub) => {
			const group = groupMap.get(sub.userId) || null;

			return {
				id: sub.id,
				userId: sub.userId,
				userName: sub.userName || sub.user?.name || 'Student',
				chapterId: sub.chapterId,
				fileUrl: sub.fileUrl,
				status: sub.status,
				approvedBy: sub.approvedBy,
				createdAt: sub.createdAt,
				updatedAt: sub.updatedAt,
				chapter: sub.chapter,
				studentName: sub.user?.name || sub.userName || 'Student',
				studentEmail: sub.user?.email || '',
				studentImage: '',
				groupName: group?.name || 'Unassigned',
				groupId: group?.id || null,
				reviewerName: sub.approvedBy || null,
			};
		});

		return NextResponse.json({
			submissions: enrichedSubmissions,
			groups: allGroups,
			chapters: allChapters,
		});
	} catch (error) {
		console.error('[SUBMISSIONS_GET]', error);
		return new NextResponse('Unable to load homework submissions.', {
			status: 500,
		});
	}
}

export async function PATCH(req: Request) {
	const reviewerId = await requireStaffAccess();
	if (!reviewerId) {
		return new NextResponse('Unauthorized', { status: 401 });
	}

	try {
		const body: unknown = await req.json();
		const requestBody =
			body && typeof body === 'object'
				? (body as { id?: unknown; status?: unknown })
				: undefined;
		const id = requestBody?.id;
		const status = requestBody?.status;

		if (typeof id !== 'string' || !id.trim()) {
			return new NextResponse('A submission id is required.', { status: 400 });
		}

		// Enforce 1-tap "Mark as Approved"
		const submission = await db.submission.update({
			where: { id: id.trim() },
			data: {
				status: 'APPROVED',
				approvedBy: reviewerId,
			},
		});

		return NextResponse.json(submission);
	} catch (error) {
		if ((error as { code?: string }).code === 'P2025') {
			return new NextResponse('Submission not found.', { status: 404 });
		}

		console.error('[SUBMISSIONS_REVIEW]', error);
		return new NextResponse('Unable to update the submission.', {
			status: 500,
		});
	}
}
