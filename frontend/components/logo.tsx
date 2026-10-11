import Link from 'next/link';

import EduLabsMark from '@/frontend/components/edulabs-mark';

interface LogoProps {
	compact?: boolean;
}

const Logo = ({ compact = false }: LogoProps) => {
	return (
		<Link aria-label="EduLabs home" className="group flex items-center gap-3" href="/home">
			<EduLabsMark className="h-10 w-10 shrink-0 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105" />
			{!compact && (
				<span className="font-display whitespace-nowrap text-2xl leading-none text-black">EduLabs</span>
			)}
		</Link>
	);
};

export default Logo;
