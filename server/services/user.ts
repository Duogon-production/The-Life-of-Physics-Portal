import 'server-only';

import { currentUser } from '@clerk/nextjs/server';
import { Role, User } from '@prisma/client';
import { db } from '@/server/db';

const ADMIN_EMAILS = [
	'bodyahmedyehia902@gmail.com',
	'support.lop.physics@gmail.com',
];

export const syncCurrentUser = async (): Promise<User | null> => {
	try {
		const clerkUser = await currentUser();
		if (!clerkUser) return null;

		const primaryEmail = clerkUser.emailAddresses.find(
			address => address.id === clerkUser.primaryEmailAddressId
		);
		// Email-based linking/admin promotion must require provider verification.
		if (primaryEmail?.verification?.status !== 'verified') return null;
		const email = primaryEmail.emailAddress?.trim().toLowerCase();
		if (!email) return null;

		const isPredefinedAdmin = ADMIN_EMAILS.includes(email);

		const fallbackName =
			[clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() ||
			clerkUser.username ||
			null;

		// 1. Check if user already exists in Prisma by EMAIL
		// This handles Clerk account deletion and re-creation with the same email.
		const userByEmail = await db.user.findUnique({
			where: { email },
		});

		if (userByEmail) {
			// Case A: User was deleted in Clerk and re-created with a new Clerk externalId!
			if (userByEmail.externalId !== clerkUser.id) {
				console.log(
					`[CLERK_DELETION_SYNC] Recreated account detected for email: ${email}. Updating externalId from ${userByEmail.externalId} to ${clerkUser.id}. Resetting approval & purging old group memberships.`
				);

				// Purge outdated group ties from old account state
				await db.userGroup.deleteMany({
					where: { userId: userByEmail.id },
				});

				const assignedRole: Role = isPredefinedAdmin ? Role.ADMIN : Role.STUDENT;
				const isApproved: boolean = isPredefinedAdmin ? true : false;

				return await db.user.update({
					where: { id: userByEmail.id },
					data: {
						externalId: clerkUser.id,
						name: fallbackName || userByEmail.name,
						role: assignedRole,
						isApproved,
						approvedAt: isApproved ? new Date() : null,
						approvedBy: null,
					},
				});
			}

			// Case B: Existing user matching both email and externalId
			if (isPredefinedAdmin && (!userByEmail.isApproved || userByEmail.role !== Role.ADMIN)) {
				return await db.user.update({
					where: { id: userByEmail.id },
					data: {
						role: Role.ADMIN,
						isApproved: true,
					},
				});
			}

			if (fallbackName && fallbackName !== userByEmail.name) {
				return await db.user.update({
					where: { id: userByEmail.id },
					data: { name: fallbackName },
				});
			}

			return userByEmail;
		}

		// 2. Check if user exists by externalId (e.g. if student changed email in Clerk)
		const userByExternalId = await db.user.findUnique({
			where: { externalId: clerkUser.id },
		});

		if (userByExternalId) {
			return await db.user.update({
				where: { id: userByExternalId.id },
				data: {
					email,
					name: fallbackName || userByExternalId.name,
				},
			});
		}

		// 3. FOR ALL BRAND NEW SIGN-UPS:
		// Strictly default to role = STUDENT, isApproved = false.
		// NEVER default new accounts to admin or teacher unless strictly matching predefined admin emails.
		const assignedRole: Role = isPredefinedAdmin ? Role.ADMIN : Role.STUDENT;
		const isApproved: boolean = isPredefinedAdmin ? true : false;

		return await db.user.create({
			data: {
				externalId: clerkUser.id,
				email,
				name: fallbackName,
				role: assignedRole,
				isApproved,
				approvedAt: isApproved ? new Date() : null,
			},
		});
	} catch (error) {
		console.error('[SYNC_CURRENT_USER_ERROR]', error);
		return null;
	}
};

export const getDbUser = async (identifier?: string | null): Promise<User | null> => {
	if (!identifier) return null;

	try {
		return await db.user.findFirst({
			where: {
				OR: [{ id: identifier }, { externalId: identifier }],
			},
		});
	} catch (error) {
		console.error('[GET_DB_USER_ERROR]', error);
		return null;
	}
};
