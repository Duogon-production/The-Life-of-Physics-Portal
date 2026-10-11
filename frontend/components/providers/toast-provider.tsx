'use client';

import { Toaster } from 'react-hot-toast';

export const ToastProvider = () => {
	return (
		<Toaster
			toastOptions={{
				style: {
					background: '#f6f9f2',
					color: '#1c2418',
					border: '2.5px solid #000',
					borderRadius: '999px',
					boxShadow: '3px 3px 0 #000',
					fontWeight: 600,
				},
				success: { iconTheme: { primary: '#7ed957', secondary: '#000' } },
			}}
		/>
	);
};
