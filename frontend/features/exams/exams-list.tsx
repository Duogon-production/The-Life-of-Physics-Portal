import type { ReactNode } from 'react';
import Link from 'next/link';
import {
	AlertTriangle,
	ArrowLeft,
	CalendarClock,
	CheckCircle2,
	Clock,
	FileText,
	Hourglass,
	Lock,
	PlayCircle,
	RotateCcw,
	Send,
	type LucideIcon,
} from 'lucide-react';

import {
	formatAttempts,
	formatTimeLimit,
	type ExamListItem,
	type ExamListState,
} from '@/shared/contracts/exam-listing';
import { cn } from '@/shared/utils';

/**
 * Server-renderable (no client hooks) views for the Firebase/Supabase Exams
 * foundation. Reuses the V2 card styling of the original ExamsView.
 * These views are READ-ONLY: starting attempts, retry decisions, answer review
 * and grading are separate deliveries that need backend contracts.
 */

const cardClass = 'rounded-2xl border-2 border-black bg-white p-5 shadow-hard-sm';

const STATE: Record<ExamListState, { text: string; className: string; icon: LucideIcon }> = {
	NOT_STARTED: { text: 'Not started', className: 'bg-white', icon: PlayCircle },
	IN_PROGRESS: { text: 'In progress', className: 'bg-amber-200', icon: Clock },
	TIME_EXPIRED: { text: 'Time expired', className: 'bg-rose-100', icon: AlertTriangle },
	SUBMITTED: { text: 'Submitted', className: 'bg-primary', icon: Send },
	GRADED: { text: 'Graded', className: 'bg-primary', icon: CheckCircle2 },
	NOT_OPEN_YET: { text: 'Opens later', className: 'bg-slate-100', icon: CalendarClock },
	CLOSED: { text: 'Closed', className: 'bg-slate-100', icon: Lock },
};

const utc = (iso: string | null) => (iso ? `${new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC` : null);

function Header({ isStaff, action }: { isStaff: boolean; action?: ReactNode }) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-black bg-white p-5 shadow-hard">
			<div className="flex items-center gap-3">
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-black bg-primary">
					<FileText className="h-6 w-6" />
				</div>
				<div>
					<h1 className="font-display text-3xl leading-none">Exams</h1>
					<p className="mt-1 text-sm text-slate-600">
						{isStaff
							? 'Create exams, manage submissions and release results for your offerings.'
							: 'Your scheduled exams, attempts and available results.'}
					</p>
				</div>
			</div>
            {action}
		</div>
	);
}

function StateBadge({ state }: { state: ExamListState }) {
	const { text, className, icon: Icon } = STATE[state];
	return (
		<span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-semibold', className)}>
			<Icon aria-hidden className="h-3.5 w-3.5" />
			{text}
		</span>
	);
}

function Facts({ exam }: { exam: ExamListItem }) {
	return (
		<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-700">
			<span className="flex items-center gap-1">
				<Clock aria-hidden className="h-3.5 w-3.5" /> {formatTimeLimit(exam.timeLimitSeconds)}
			</span>
			<span className="flex items-center gap-1">
				<RotateCcw aria-hidden className="h-3.5 w-3.5" /> {formatAttempts(exam.maxAttempts)}
			</span>
			<span>{exam.questionCount === null ? 'Question count unavailable' : `${exam.questionCount} question${exam.questionCount === 1 ? '' : 's'}`}</span>
			<span className="capitalize">{exam.kind}</span>
		</div>
	);
}

/** Only staff-finalized ('graded') attempts expose a mark; anything else stays unannounced. */
function releasedMark(exam: ExamListItem) {
	const graded = [...exam.attempts].reverse().find((a) => a.status === 'graded' && a.score !== null && a.maxScore !== null);
	return graded ? `${graded.score} / ${graded.maxScore}` : null;
}

export function ExamsListView({ items, isStaff, truncated, action }: { items: ExamListItem[]; isStaff: boolean; truncated: boolean; action?: ReactNode }) {
	return (
		<div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
			<Header isStaff={isStaff} action={action} />
			{truncated && (
				<p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
					This list is partial because it reached a safety limit. Some exams may not be shown.
				</p>
			)}
			{isStaff && (
				<p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
					Exam creation, settings and grading are not available here yet.
				</p>
			)}
			{items.length === 0 ? (
				<div className={cn(cardClass, 'text-center text-slate-600')}>
					{isStaff ? 'No exams are scheduled for your offerings yet.' : 'No exams are available right now. Published exams for your enrolled groups will appear here.'}
				</div>
			) : (
				<ul className="grid gap-4 md:grid-cols-2">
					{items.map((exam) => {
						const mark = releasedMark(exam);
						return (
							<li key={exam.id}>
								<Link href={`/exams/${exam.id}`} className={cn(cardClass, 'block h-full transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2')}>
									<div className="flex items-start justify-between gap-3">
										<h2 className="text-lg font-bold leading-snug">{exam.title}</h2>
										<StateBadge state={exam.state} />
									</div>
									<p className="mt-1 text-xs text-slate-500">
										{exam.courseTitle ? `${exam.courseTitle} · ` : ''}{exam.offeringName}
									</p>
									{exam.instructions && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{exam.instructions}</p>}
									<Facts exam={exam} />
									{exam.attempts.length > 0 && (
										<p className="mt-3 text-xs font-medium text-slate-700">
											Attempts started: {exam.attempts.length}
											{exam.maxAttempts !== null ? ` of ${exam.maxAttempts}` : ''}
										</p>
									)}
									{mark && <p className="mt-2 text-sm font-bold">Released mark: {mark}</p>}
									{!isStaff && exam.state === 'SUBMITTED' && (
										<p className="mt-2 flex items-center gap-1 text-sm font-medium text-slate-700">
											<Hourglass aria-hidden className="h-4 w-4" /> Results have not been released yet.
										</p>
									)}
								</Link>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}

export function ExamsErrorView() {
	return (
		<div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
			<Header isStaff={false} />
			<div role="alert" className={cn(cardClass, 'border-rose-600 text-center')}>
				<AlertTriangle aria-hidden className="mx-auto h-6 w-6 text-rose-600" />
				<p className="mt-2 font-semibold">We could not load your exams.</p>
				<p className="mt-1 text-sm text-slate-600">Your data is safe. Please refresh the page or try again in a moment.</p>
				<Link href="/exams" className="mt-4 inline-block rounded-xl border-2 border-black bg-primary px-4 py-2 text-sm font-semibold shadow-hard-sm">
					Try again
				</Link>
			</div>
		</div>
	);
}

export function ExamNotFoundView() {
	return (
		<div className="mx-auto w-full max-w-3xl space-y-4">
			<div className={cn(cardClass, 'text-center')}>
				<p className="font-semibold">This exam is not available.</p>
				<p className="mt-1 text-sm text-slate-600">It may not be published for your group, or you may not have access.</p>
				<Link href="/exams" className="mt-4 inline-block text-sm font-semibold text-sky-700">Back to Exams</Link>
			</div>
		</div>
	);
}

export function ExamDetailView({ exam, isStaff }: { exam: ExamListItem; isStaff: boolean }) {
	const mark = releasedMark(exam);
	return (
		<div className="mx-auto w-full max-w-3xl space-y-6 pb-12">
			<Link href="/exams" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700">
				<ArrowLeft aria-hidden className="h-4 w-4" /> Back to Exams
			</Link>
			<div className={cardClass}>
				<div className="flex items-start justify-between gap-3">
					<h1 className="font-display text-2xl leading-tight">{exam.title}</h1>
					<StateBadge state={exam.state} />
				</div>
				<p className="mt-1 text-xs text-slate-500">
					{exam.courseTitle ? `${exam.courseTitle} · ` : ''}{exam.offeringName}
				</p>
				{exam.instructions && <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{exam.instructions}</p>}
				<Facts exam={exam} />
				<dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
					<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Opens</dt><dd>{utc(exam.opensAt) ?? 'Any time'}</dd></div>
					<div><dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Closes</dt><dd>{utc(exam.closesAt) ?? 'No deadline'}</dd></div>
				</dl>
				{exam.timeLimitSeconds !== null && (
					<p className="mt-3 text-xs text-slate-500">The countdown is set by the server when an attempt starts and cannot be changed in your browser.</p>
				)}
			</div>

			<div className={cardClass}>
				<h2 className="text-lg font-bold">{isStaff ? 'Your attempts (if enrolled)' : 'Your attempts'}</h2>
				{exam.attempts.length === 0 ? (
					<p className="mt-2 text-sm text-slate-600">No attempts have been started.</p>
				) : (
					<div className="mt-3 overflow-x-auto">
						<table className="w-full min-w-[420px] text-left text-sm">
							<thead className="text-xs uppercase tracking-wider text-slate-500">
								<tr><th className="py-1 pr-3">Attempt</th><th className="py-1 pr-3">Status</th><th className="py-1 pr-3">Started</th><th className="py-1">Submitted</th></tr>
							</thead>
							<tbody>
								{exam.attempts.map((a) => (
									<tr key={a.attemptNumber} className="border-t border-slate-100">
										<td className="py-2 pr-3 font-semibold">#{a.attemptNumber}</td>
										<td className="py-2 pr-3 capitalize">{a.status.replace('_', ' ')}</td>
										<td className="py-2 pr-3">{utc(a.startedAt)}</td>
										<td className="py-2">{utc(a.submittedAt) ?? '—'}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				{mark ? (
					<p className="mt-3 text-sm font-bold">Released mark: {mark}</p>
				) : exam.attempts.some((a) => a.status === 'submitted') ? (
					<p className="mt-3 flex items-center gap-1 text-sm font-medium text-slate-700"><Hourglass aria-hidden className="h-4 w-4" /> Results have not been released yet.</p>
				) : null}
			</div>

			<p role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
				This page shows exam information only. Taking exams, retry choices and detailed answer review are not available yet.
			</p>
		</div>
	);
}
