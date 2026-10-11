import { isFirebaseStaging } from '@/shared/auth-config';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { ExamRunner } from '@/frontend/features/exams/exam-runner';
import { isAdminOrTeacher } from '@/server/services/teacher';

const ExamPage = async ({ params }: { params: Promise<{ examId: string }> }) => {
	if (isFirebaseStaging()) return redirect('/unavailable');
	const { userId, sessionClaims } = await auth();
	if (!userId) return redirect('/');

	// Staff manage exams from /exams; only students take them.
	if (await isAdminOrTeacher(userId, sessionClaims)) return redirect('/exams');

	const { examId } = await params;
	return <ExamRunner examId={examId} />;
};

export default ExamPage;
