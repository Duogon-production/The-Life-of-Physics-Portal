import { getAnalytics } from '@/server/queries/get-analytics';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDbUser } from '@/server/services/user';
import DataCard from '@/frontend/features/teacher/analytics/data-card';
import { Chart } from '@/frontend/features/teacher/analytics/chart';

const AnalyticsPage = async () => {
	const { userId } = await auth();

	if (!userId) return redirect('/');

	const dbUser = await getDbUser(userId);
	if (!dbUser || dbUser.role === 'STUDENT' || (dbUser.role as string) === 'student') {
		return redirect('/');
	}

	const { data, totalViews, totalCourses } = await getAnalytics(userId);

	return (
		<div className="p-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<DataCard label="Total lesson views" value={totalViews} />

				<DataCard label="Lessons created" value={totalCourses} />
			</div>

			{data.length > 0 && <Chart data={data} />}
		</div>
	);
};

export default AnalyticsPage;
