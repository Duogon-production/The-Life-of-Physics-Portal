import EduLabsMark from '@/frontend/components/edulabs-mark';

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="min-h-full flex flex-col items-center justify-center gap-6 p-4">
			<div className="flex items-center gap-3">
				<EduLabsMark grow className="h-12 w-12" />
				<span className="font-display text-4xl leading-none text-black">EduLabs</span>
			</div>
			{children}
		</div>
	);
};

export default AuthLayout;
