'use client';

import { UserButton } from '@clerk/nextjs';

const NavbarRoutes = () => {
	return (
		<div className="ml-auto flex items-center">
			<UserButton
				showName={true}
				appearance={{
					elements: {
						rootBox: 'flex items-center',
						userButtonBox: 'flex-row-reverse gap-2.5',
						userButtonOuterIdentifier: 'font-semibold text-slate-700 text-sm',
						avatarBox: 'h-9 w-9 border border-slate-200',
					},
				}}
			/>
		</div>
	);
};

export default NavbarRoutes;
