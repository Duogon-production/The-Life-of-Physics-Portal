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
import { isFirebaseStaging } from '@/shared/auth-config';
import { FirebaseAuthProvider } from '@/frontend/components/providers/firebase-auth-provider';

const inter = Inter({ subsets: ['latin'] });
// Both backends render request-specific authentication; never prerender accounts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
	title: 'The Life of Physics | 3rd Secondary',
	description: 'The Life of Physics learning platform for 3rd Secondary students.',
};

export default async function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const firebase = isFirebaseStaging();
	const session = firebase ? null : await auth();
	const isStaff = session ? await isTeacher(session.userId, session.sessionClaims) : false;
	const AuthProvider = firebase ? FirebaseAuthProvider : ClerkProvider;

	return (
		<AuthProvider {...(firebase ? {} : { afterSignOutUrl: '/', appearance: { options: { showOptionalFields: true } } })}>
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

							{!firebase && !isStaff && <FacebookMessenger />}
						</LoadingProvider>
					</ThemeProvider>
				</body>
			</html>
		</AuthProvider>
	);
}
