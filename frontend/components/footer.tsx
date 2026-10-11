'use client';

import Link from 'next/link';
import { HelpCircle, MessageCircle, Phone } from 'lucide-react';
import { TEACHER_CONTACT } from '@/shared/constants/contact';

const Footer = () => {
	const contactClass = 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border-2 border-black px-3.5 py-2 text-sm font-semibold shadow-hard-sm transition-all hover:-translate-y-px hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2';

	return (
		<footer className="border-t-[2.5px] border-black bg-white px-4 py-6 sm:px-6">
			<div className="mx-auto max-w-7xl">
				<div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
					<div className="space-y-1">
						<p className="font-display text-xl text-slate-900">EduLabs</p>
						<p className="text-xs leading-relaxed text-slate-500">
							Lesson questions? Contact {TEACHER_CONTACT.name} · {TEACHER_CONTACT.displayPhone}
						</p>
					</div>
					<nav aria-label="Contact and support" className="flex flex-wrap items-center gap-2">
						<a href={TEACHER_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${contactClass} bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}>
							<MessageCircle className="h-4 w-4" aria-hidden="true" />
							WhatsApp Mrs. Ghada
						</a>
						<a href={TEACHER_CONTACT.phoneUrl} className={`${contactClass} bg-white text-slate-700 hover:bg-slate-100`}>
							<Phone className="h-4 w-4" aria-hidden="true" />
							Call Mrs. Ghada
						</a>
						<Link href="/support" className={`${contactClass} text-sky-700 hover:bg-sky-50`}>
							<HelpCircle className="h-4 w-4" aria-hidden="true" />
							Support
						</Link>
					</nav>
				</div>
				<p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
					Made by: <span className="font-medium text-slate-700">Mohamed Ahmed Yehia</span> &amp; <span className="font-medium text-slate-700">Mohamed Tamer Mohamed</span>
				</p>
			</div>
		</footer>
	);
};

export default Footer;
