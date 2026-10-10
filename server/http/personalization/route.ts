import 'server-only';

import { db } from '@/server/db';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
	try {
		const { userId } = await auth();
		const { ...values } = await req.json();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const personalization = await db.personalization.upsert({
			where: {
				userId,
			},
			update: { ...values },
			create: {
				userId,
				...values,
			},
		});

		return NextResponse.json(personalization);
	} catch (error) {
		console.log('[ERROR] PUT /api/personalization', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}

export async function GET(req: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return new NextResponse('Unauthorized', { status: 401 });
		}

		const personalization = await db.personalization.findUnique({
			where: {
				userId,
			},
		});

		return NextResponse.json(personalization);
	} catch (error) {
		console.log('[ERROR] GET /api/personalization', error);
		return new NextResponse('Internal server error', { status: 500 });
	}
}
