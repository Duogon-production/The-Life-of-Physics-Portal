import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/frontend/components/providers/toast-provider';
import { ThemeProvider } from '@/frontend/components/theme-provider';
import FacebookMessenger from '@/frontend/components/facebook-messenger';
import { isTeacher } from '@/server/services/teacher';
import { LoadingProvider } from '@/frontend/components/providers/loading-provider';
import ScrollToTop from '@/frontend/components/scroll-to-top';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'The Life of Physics | 3rd Secondary',
	description: 'The Life of Physics learning platform for 3rd Secondary students.',
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { userId, sessionClaims } = await auth();
	const isStaff = await isTeacher(userId, sessionClaims);

	return (
		<ClerkProvider afterSignOutUrl="/" appearance={{ options: { showOptionalFields: true } }}>
			<html lang="en" suppressHydrationWarning>
				<body className={inter.className}>
					<ThemeProvider
						attribute="class"
						defaultTheme="light"
						forcedTheme="light"
						enableSystem={false}
						disableTransitionOnChange
					>
						<LoadingProvider>
							<ScrollToTop />

							<ToastProvider />

							{children}

							{!isStaff && <FacebookMessenger />}
						</LoadingProvider>
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
