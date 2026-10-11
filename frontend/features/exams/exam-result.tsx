'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Hourglass, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/frontend/lib/api';
import type { ExamResult, ExamResultQuestion } from '@/shared/contracts/exams';
import { attemptLabel, choiceLabel } from '@/shared/exams';
import { cn } from '@/shared/utils';

/** Final mark plus the visual answer history. Only rendered after the student finalised. */
export const ExamResultView = ({ examId }: { examId: string }) => {
	const [result, setResult] = useState<ExamResult | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		api
			.get<ExamResult>(`/api/exams/${examId}/result`)
			.then((res) => setResult(res.data))
			.catch(() => toast.error('Could not load your result.'))
			.finally(() => setIsLoading(false));
	}, [examId]);

	if (isLoading) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="h-6 w-6 animate-spin text-slate-500" />
			</div>
		);
	}
	if (!result) return null;

	const graded = result.writtenStatus === 'GRADED';
	const hasWritten = result.writtenStatus !== 'NONE';
	const total = result.mcqScore + (result.writtenScore ?? 0);
	const possible = result.mcqTotal + result.writtenTotal;

	return (
		<div className="mx-auto w-full max-w-3xl space-y-5 pb-16">
			<Link href="/exams" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-black">
				<ArrowLeft className="h-4 w-4" /> All exams
			</Link>

			<div className="space-y-3 rounded-3xl border-2 border-black bg-white p-6 shadow-hard">
				<h1 className="font-display text-3xl leading-tight">{result.title}</h1>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="rounded-2xl border-2 border-black bg-primary p-4">
						<p className="text-xs font-bold uppercase tracking-wider">Multiple choice</p>
						<p className="text-3xl font-extrabold">
							{result.mcqScore} <span className="text-lg font-semibold">/ {result.mcqTotal}</span>
						</p>
					</div>
					{hasWritten && (
						<div className={cn('rounded-2xl border-2 border-black p-4', graded ? 'bg-primary' : 'bg-sky-200')}>
							<p className="text-xs font-bold uppercase tracking-wider">Written</p>
							{graded ? (
								<p className="text-3xl font-extrabold">
									{result.writtenScore} <span className="text-lg font-semibold">/ {result.writtenTotal}</span>
								</p>
							) : (
								<p className="flex items-center gap-2 pt-1 text-lg font-extrabold">
									<Hourglass className="h-5 w-5" /> Under Correction
								</p>
							)}
						</div>
					)}
				</div>
				{(graded || !hasWritten) && (
					<p className="text-sm font-bold">
						Final mark: {total} / {possible}
					</p>
				)}
				{hasWritten && !graded && (
					<p className="text-sm text-slate-600">
						Your written answers will be marked by your teacher. Your final mark appears here once the correction is done.
					</p>
				)}
				{result.reviewNote && (
					<div className="rounded-xl border-2 border-black bg-sky-50 p-3 text-sm">
						<p className="mb-1 text-xs font-bold uppercase tracking-wider text-sky-800">Teacher feedback</p>
						<p className="whitespace-pre-wrap">{result.reviewNote}</p>
					</div>
				)}
			</div>

			<Legend />

			{result.questions.map((q) => (
				<QuestionHistory key={q.id} question={q} />
			))}
		</div>
	);
};

const Legend = () => (
	<div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-black bg-white p-3 text-xs font-semibold shadow-hard-sm">
		<span className="flex items-center gap-1.5">
			<span className="h-3.5 w-3.5 rounded border-2 border-black bg-emerald-300" /> Correct answer
		</span>
		<span className="flex items-center gap-1.5">
			<span className="h-3.5 w-3.5 rounded border-2 border-black bg-rose-300" /> Your wrong choice
		</span>
		<span className="flex items-center gap-1.5">
			<span className="rounded-full border-2 border-black bg-white px-1.5 text-[10px]">1st Try</span> which attempt you picked it
		</span>
	</div>
);

const QuestionHistory = ({ question: q }: { question: ExamResultQuestion }) => {
	const summary = q.picks
		.map((pick) => `${attemptLabel(pick.attemptNumber)}: ${pick.choice === null ? 'No answer' : `Choice ${choiceLabel(pick.choice)}`}`)
		.join(' · ');

	return (
		<div className="space-y-3 rounded-2xl border-2 border-black bg-white p-5 shadow-hard-sm">
			<div className="flex items-start justify-between gap-3">
				<p className="font-semibold leading-snug">
					<span className="mr-1.5 text-slate-500">Q{q.position}.</span>
					{q.text}
				</p>
				<span className="shrink-0 text-xs font-bold text-slate-600">{q.points} pt{q.points > 1 ? 's' : ''}</span>
			</div>
			{q.imageUrl && (
				// eslint-disable-next-line @next/next/no-img-element
				<img src={q.imageUrl} alt="" className="max-h-64 rounded-xl border-2 border-black object-contain" />
			)}

			{q.type === 'MCQ' ? (
				<>
					<div className="space-y-2">
						{(q.choices ?? []).map((choice, index) => {
							const isCorrect = index === q.correctChoice;
							const picksHere = q.picks.filter((pick) => pick.choice === index);
							const isWrongPick = !isCorrect && picksHere.length > 0;
							return (
								<div
									key={index}
									className={cn(
										'flex flex-wrap items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm',
										isCorrect && 'border-emerald-600 bg-emerald-100',
										isWrongPick && 'border-rose-600 bg-rose-100',
										!isCorrect && !isWrongPick && 'border-slate-200 bg-white'
									)}
								>
									<span
										className={cn(
											'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
											isCorrect ? 'border-emerald-700 bg-emerald-300' : isWrongPick ? 'border-rose-700 bg-rose-300' : 'border-slate-300'
										)}
									>
										{isCorrect ? <Check className="h-3.5 w-3.5" /> : isWrongPick ? <X className="h-3.5 w-3.5" /> : choiceLabel(index)}
									</span>
									<span className="min-w-0 flex-1 break-words">{choice}</span>
									{picksHere.map((pick) => (
										<span
											key={pick.attemptNumber}
											className={cn(
												'rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-bold',
												isCorrect ? 'bg-emerald-300' : 'bg-rose-300'
											)}
										>
											{attemptLabel(pick.attemptNumber)}
										</span>
									))}
								</div>
							);
						})}
					</div>
					{summary && <p className="text-xs font-medium text-slate-600">{summary}</p>}
				</>
			) : (
				<div className="space-y-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
					<p className="text-xs font-bold uppercase tracking-wider text-slate-600">Your written answer</p>
					{q.written?.text && <p className="whitespace-pre-wrap text-sm">{q.written.text}</p>}
					{q.written?.imageUrl && (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={q.written.imageUrl} alt="Your handwritten answer" className="max-h-72 rounded-lg border-2 border-black object-contain" />
					)}
					{!q.written?.text && !q.written?.imageUrl && <p className="text-sm italic text-slate-500">No answer given.</p>}
					<p className="flex items-center gap-1.5 text-sm font-bold">
						{q.writtenScore !== null ? (
							<>
								Mark: {q.writtenScore} / {q.points}
							</>
						) : (
							<span className="inline-flex items-center gap-1.5 rounded-full border-2 border-black bg-sky-200 px-2.5 py-0.5 text-xs">
								<Hourglass className="h-3.5 w-3.5" /> Under Correction
							</span>
						)}
					</p>
				</div>
			)}
		</div>
	);
};
