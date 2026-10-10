import { getCategories } from '@/server/queries/catalog';
import Categories from '@/frontend/features/search/categories';
import SearchInput from '@/frontend/components/search-input';
import { getCourses } from '@/server/queries/get-courses';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CoursesList from '@/frontend/components/courses-list';

interface SearchPageProps {
	searchParams: Promise<{
		title: string;
		categoryId: string;
	}>;
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
	const { userId } = await auth();

	if (!userId) return redirect('/');

	const categories = await getCategories();

	const courses = await getCourses({
		userId,
		...(await searchParams),
	});

	return (
		<>
			<div className="px-6 pt-6 block md:hidden md:mb-0">
				<SearchInput />
			</div>

			<div className="p-6 space-y-4">
				<Categories items={categories} />

				<CoursesList items={courses} size="sm" />
			</div>
		</>
	);
};

export default SearchPage;
