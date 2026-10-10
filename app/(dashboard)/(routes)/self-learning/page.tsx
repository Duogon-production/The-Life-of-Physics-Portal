import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getSelfLearningChapters } from '@/server/queries/self-learning';
import { SelfLearningView } from '@/frontend/features/self-learning/self-learning-view';



const SelfLearningPage = async () => {
	const { userId } = await auth();

	if (!userId) {
		return redirect('/');
	}

	const chapters = await getSelfLearningChapters(userId);

	return <SelfLearningView chapters={chapters} />;
};

export default SelfLearningPage;
