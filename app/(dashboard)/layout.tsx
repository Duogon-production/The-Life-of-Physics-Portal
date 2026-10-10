import { auth } from '@clerk/nextjs/server';
import Sidebar from '@/frontend/components/sidebar';
import MobileSidebar from '@/frontend/features/dashboard/mobile-sidebar';
import Footer from '@/frontend/components/footer';
import SupportModal from '@/frontend/components/support-modal';
import WaitlistOverlay from '@/frontend/components/waitlist-overlay';
import { syncCurrentUser } from '@/server/services/user';

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
	const { userId } = await auth();
	let initialIsApproved = true;
	let initialName: string | null = '';
	let userRole: string | null = null;
	let shouldShowWaitlist = false;

	if (userId) {
		const dbUser = await syncCurrentUser();
		if (dbUser) {
			userRole = dbUser.role;
			const isStudent =
			dbUser.role === 'STUDENT' || (dbUser.role as string) === 'student';
			initialIsApproved = dbUser.isApproved;
			initialName = dbUser.name;

			if (!dbUser.isApproved && isStudent) {
				shouldShowWaitlist = true;
			}
		} else {
			shouldShowWaitlist = true;
			initialIsApproved = false;
		}
	}

	return (
		<div className="min-h-screen bg-slate-50 w-full relative">
		{/* Sticky Mobile Header & Drawer Trigger */}
		<MobileSidebar initialRole={userRole} />

		{/* Floating Desktop Sidebar */}
		<aside className="hidden md:block fixed left-4 top-4 bottom-4 w-64 z-50">
		<Sidebar initialRole={userRole} />
		</aside>

		{/* Main Content Canvas: Removed overflow-y-auto so native mobile window scroll works 100% */}
		<main className="md:pl-72 pt-2 md:pt-4 min-h-screen bg-slate-50 flex flex-col justify-between">
		<div className="flex-1 w-full p-4 sm:p-6 md:p-8">
		{children}
		</div>
		<Footer />
		</main>

		{/* Global Support Modal */}
		<SupportModal />

		{/* Waitlist Hard-Lock Overlay */}
		{userId && shouldShowWaitlist && (
			<WaitlistOverlay
			initialIsApproved={false}
			initialName={initialName}
			/>
		)}
		</div>
	);
};

export default DashboardLayout;
