'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser, useClerk } from '@clerk/nextjs';
import { api } from '@/frontend/lib/api';
import {
	Home,
	BookOpen,
	Users,
	Calendar,
	FileText,
	HelpCircle,
	LogOut,
	CheckSquare,
	ShieldCheck,
	Atom,
} from 'lucide-react';

import { cn } from '@/shared/utils';
import { useSupportModal } from '@/frontend/hooks/use-support-modal';

interface SidebarProps {
	className?: string;
	initialRole?: string | null;
	onNavigate?: () => void;
}

const Sidebar = ({ className, initialRole, onNavigate }: SidebarProps) => {
	const pathname = usePathname();
	const { user: clerkUser } = useUser();
	const { signOut } = useClerk();
	const { onOpen: onOpenSupport } = useSupportModal();

	const [role, setRole] = useState<string | null>(
		initialRole ? initialRole.toLowerCase() : null
	);

	useEffect(() => {
		api
		.get('/api/user/status')
		.then((res) => {
			if (res.data?.user?.role) {
				setRole(res.data.user.role.toLowerCase());
			}
		})
		.catch(() => {});
	}, []);

	const isAdminOrTeacher = role === 'admin' || role === 'teacher';

	const isHomeActive = pathname === '/' || pathname === '/home';
	const isSelfLearningActive =
	pathname === '/self-learning' ||
	pathname.startsWith('/self-learning') ||
	pathname.startsWith('/courses');
	const isGroupActive =
	pathname === '/group' ||
	pathname === '/groups' ||
	pathname.startsWith('/group');
	const isTeacherActive = pathname.startsWith('/teacher');
	const isAdminUsersActive = pathname.startsWith('/admin/users');
	const isAdminSubmissionsActive = pathname.startsWith('/admin/submissions');

	const displayName =
	clerkUser?.fullName ||
	clerkUser?.username ||
	[clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ') ||
	'Student User';

	return (
		<aside
		className={cn(
			'h-full w-full bg-white rounded-3xl border border-slate-200/80 shadow-2xl shadow-slate-900/10 flex flex-col justify-between overflow-hidden select-none',
			className
		)}
		>
		<div className="flex flex-col flex-1 min-h-0">
		{/* 1. TOP BRANDING HEADER */}
		<div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-900 text-white shrink-0">
		<div className="bg-cyan-500/20 p-2 rounded-xl border border-cyan-400/30 shrink-0">
		<Atom className="h-6 w-6 text-cyan-400 animate-pulse" />
		</div>
		<div className="flex flex-col min-w-0">
		<span className="font-bold text-sm tracking-wide text-white leading-tight truncate">
		LIFE OF PHYSICS
		</span>
		<span className="text-[10px] font-semibold text-cyan-400">
		3rd Secondary
		</span>
		</div>
		</div>

		{/* 2. TACTILE NAVIGATION LINKS */}
		<div className="p-3 flex flex-col space-y-1.5 overflow-y-auto scrollbar-none flex-1">
		<Link
		href="/home"
		onClick={() => onNavigate?.()}
		className={cn(
			'relative flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium rounded-xl transition-all duration-200 ease-out cursor-pointer active:scale-[0.97]',
			isHomeActive
			? 'bg-cyan-500/10 text-cyan-700 border-r-4 border-cyan-500 font-semibold shadow-sm'
			: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
		)}
		>
		<Home
		className={cn(
			'w-[22px] h-[22px] shrink-0 transition-colors',
			isHomeActive ? 'text-cyan-600' : 'text-slate-500'
		)}
		/>
		<span>Home</span>
		</Link>

		<Link
		href="/self-learning"
		onClick={() => onNavigate?.()}
		className={cn(
			'relative flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium rounded-xl transition-all duration-200 ease-out cursor-pointer active:scale-[0.97]',
			isSelfLearningActive
			? 'bg-cyan-500/10 text-cyan-700 border-r-4 border-cyan-500 font-semibold shadow-sm'
			: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
		)}
		>
		<BookOpen
		className={cn(
			'w-[22px] h-[22px] shrink-0 transition-colors',
			isSelfLearningActive ? 'text-cyan-600' : 'text-slate-500'
		)}
		/>
		<span>Self Learning</span>
		</Link>

		<Link
		href="/group"
		onClick={() => onNavigate?.()}
		className={cn(
			'relative flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium rounded-xl transition-all duration-200 ease-out cursor-pointer active:scale-[0.97]',
			isGroupActive
			? 'bg-cyan-500/10 text-cyan-700 border-r-4 border-cyan-500 font-semibold shadow-sm'
			: 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
		)}
		>
		<Users
		className={cn(
			'w-[22px] h-[22px] shrink-0 transition-colors',
			isGroupActive ? 'text-cyan-600' : 'text-slate-500'
		)}
		/>
		<span>Group</span>
		</Link>

		<div
		aria-disabled="true"
		className="flex items-center justify-between px-4 py-3.5 min-h-[48px] text-[15px] font-medium text-slate-400 rounded-xl cursor-not-allowed select-none"
		>
		<div className="flex items-center gap-3.5">
		<Calendar className="w-[22px] h-[22px] shrink-0 text-slate-400" />
		<span>Sessions</span>
		</div>
		<span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
		Soon
		</span>
		</div>

		<div
		aria-disabled="true"
		className="flex items-center justify-between px-4 py-3.5 min-h-[48px] text-[15px] font-medium text-slate-400 rounded-xl cursor-not-allowed select-none"
		>
		<div className="flex items-center gap-3.5">
		<FileText className="w-[22px] h-[22px] shrink-0 text-slate-400" />
		<span>Exams</span>
		</div>
		<span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
		Soon
		</span>
		</div>

		<button
		type="button"
		onClick={() => {
			onNavigate?.();
			onOpenSupport();
		}}
		className="flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-150 w-full text-left cursor-pointer active:scale-[0.97]"
		>
		<HelpCircle className="w-[22px] h-[22px] shrink-0 text-slate-500" />
		<span>Website Help</span>
		</button>

		{isAdminOrTeacher && (
			<div className="pt-3 mt-1 border-t border-slate-200/80 flex flex-col space-y-1.5">
			<span className="px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
			Admin &amp; Teacher
			</span>
			<Link
			href="/admin/users"
			onClick={() => onNavigate?.()}
			className={cn(
				'relative flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium rounded-xl transition-all duration-200 ease-out cursor-pointer active:scale-[0.97]',
				 isAdminUsersActive
				 ? 'bg-cyan-500/10 text-cyan-800 border-r-4 border-cyan-500 font-semibold shadow-sm'
				 : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
			)}
			>
			<Users
			className={cn(
				'w-[22px] h-[22px] shrink-0',
				 isAdminUsersActive ? 'text-cyan-700' : 'text-slate-500'
			)}
			/>
			<span>Users &amp; Groups</span>
			</Link>

			<Link
			href="/admin/submissions"
			onClick={() => onNavigate?.()}
			className={cn(
				'relative flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium rounded-xl transition-all duration-200 ease-out cursor-pointer active:scale-[0.97]',
				 isAdminSubmissionsActive
				 ? 'bg-cyan-500/10 text-cyan-800 border-r-4 border-cyan-500 font-semibold shadow-sm'
				 : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
			)}
			>
			<CheckSquare
			className={cn(
				'w-[22px] h-[22px] shrink-0',
				 isAdminSubmissionsActive ? 'text-cyan-700' : 'text-slate-500'
			)}
			/>
			<span>Homework Queue</span>
			</Link>

			<Link
			href="/teacher/courses"
			onClick={() => onNavigate?.()}
			className={cn(
				'relative flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium rounded-xl transition-all duration-200 ease-out cursor-pointer active:scale-[0.97]',
				 isTeacherActive
				 ? 'bg-cyan-500/10 text-cyan-800 border-r-4 border-cyan-500 font-semibold shadow-sm'
				 : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
			)}
			>
			<ShieldCheck
			className={cn(
				'w-[22px] h-[22px] shrink-0',
				 isTeacherActive ? 'text-cyan-700' : 'text-slate-500'
			)}
			/>
			<span>Teacher Courses</span>
			</Link>
			</div>
		)}
		</div>
		</div>

		{/* 3. BOTTOM FOOTER WITH USER PROFILE & LOGOUT */}
		<div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0 space-y-2">
		<div className="flex items-center gap-3 p-2 rounded-2xl bg-white border border-slate-200/60 shadow-sm">
		{/* z-[99999] and pointer-events-auto fixes Clerk popover touch lock inside Radix Sheet */}
		<UserButton
		appearance={{
			elements: {
				avatarBox: 'h-9 w-9 border-2 border-cyan-500 shadow-sm',
		 userButtonPopoverCard: 'shadow-xl rounded-2xl border border-slate-200 z-[99999] pointer-events-auto',
		 userButtonPopoverMain: 'z-[99999] pointer-events-auto',
			},
		}}
		/>
		<div className="flex flex-col min-w-0 flex-1">
		<span className="text-xs font-bold text-slate-900 truncate leading-tight">
		{displayName}
		</span>
		<div className="flex items-center gap-1.5 mt-0.5">
		<span
		className={cn(
			'inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase leading-none border',
			role === 'admin'
			? 'bg-rose-50 text-rose-700 border-rose-200'
			: role === 'teacher'
			? 'bg-amber-50 text-amber-700 border-amber-200'
			: 'bg-cyan-50 text-cyan-700 border-cyan-200'
		)}
		>
		{role ? role.toUpperCase() : 'STUDENT'}
		</span>
		</div>
		</div>
		</div>

		<button
		type="button"
		onClick={() => {
			onNavigate?.();
			signOut(() => window.location.assign('/'));
		}}
		className="flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-150 w-full text-left cursor-pointer active:scale-[0.97]"
		>
		<LogOut className="w-4 h-4 shrink-0 text-slate-500" />
		<span>Logout</span>
		</button>
		</div>
		</aside>
	);
};

export default Sidebar;
