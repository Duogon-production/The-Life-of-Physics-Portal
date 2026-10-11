'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Clock, Loader2, RotateCcw, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';

import FileUpload from '@/frontend/components/file-upload';
import { api } from '@/frontend/lib/api';
import { Button } from '@/frontend/components/ui/button';
import { Textarea } from '@/frontend/components/ui/textarea';
import { ExamResultView } from '@/frontend/features/exams/exam-result';
import type { ExamRunQuestion, ExamRunState } from '@/shared/contracts/exams';
import {
	MAX_WRITTEN_ANSWER_TEXT,
	RETRY_PROMPT,
	attemptLabel,
	choiceLabel,
	formatDuration,
	type ExamAnswers,
} from '@/shared/exams';
import { cn } from '@/shared/utils';

const errorMessage = (error: unknown, fallback: string) => {
	const data = (error as { response?: { data?: unknown } })?.response?.data;
	return typeof data === 'string' && data ? data : fallback;
};

const formatClock = (totalSeconds: number) => {
	const s = Math.max(0, totalSeconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const mm = String(m).padStart(2, '0');
	const ss = String(sec).padStart(2, '0');
	return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export const ExamRunner = ({ examId }: { examId: string }) => {
	const [state, setState] = useState<ExamRunState | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isBusy, setIsBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await api.get<ExamRunState>(`/api/exams/${examId}`);
			setState(res.data);
		} catch (error) {
			toast.error(errorMessage(error, 'Could not load the exam.'));
		} finally {
			setIsLoading(false);
		}
	}, [examId]);

	useEffect(() => {
		load();
	}, [load]);

	const start = async () => {
		try {
			setIsBusy(true);
			const res = await api.post<ExamRunState>(`/api/exams/${examId}/start`);
			setState(res.data);
		} catch (error) {
			toast.error(errorMessage(error, 'Could not start the exam.'));
		} finally {
			setIsBusy(false);
		}
	};

	const decide = async (decision: 'FINALIZE' | 'RETRY') => {
		try {
			setIsBusy(true);
			await api.post(`/api/exams/${examId}/decision`, { decision });
			await load();
		} catch (error) {
			toast.error(errorMessage(error, 'Could not continue.'));
			await load();
		} finally {
			setIsBusy(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="h-6 w-6 animate-spin text-slate-500" />
			</div>
		);
	}
	if (!state) {
		return (
			<div className="mx-auto max-w-xl rounded-2xl border-2 border-black bg-white p-6 text-center shadow-hard-sm">
				This exam is not available.{' '}
				<Link href="/exams" className="font-semibold underline">
					Back to exams
				</Link>
			</div>
		);
	}

	if (state.status === 'FINALIZED') return <ExamResultView examId={examId} />;

	if (state.status === 'AWAITING_DECISION') {
		return (
			<div className="mx-auto w-full max-w-xl space-y-5 pt-6">
				<div className="space-y-5 rounded-3xl border-2 border-black bg-white p-6 shadow-hard">
					<div className="flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-amber-200">
							<AlertTriangle className="h-5 w-5" />
						</div>
						<div>
							<h1 className="font-display text-2xl leading-tight">{state.exam.title}</h1>
							<p className="mt-2 text-base font-medium leading-relaxed">{RETRY_PROMPT}</p>
						</div>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button variant="outline" className="flex-1" disabled={isBusy} onClick={() => decide('FINALIZE')}>
							View my final mark
						</Button>
						<Button className="flex-1" disabled={isBusy} onClick={() => decide('RETRY')}>
							<RotateCcw className="mr-2 h-4 w-4" /> Take 2nd attempt
						</Button>
					</div>
					<p className="text-xs text-slate-600">
						Taking the 2nd attempt replaces your 1st attempt as your final answers. Your multiple-choice answers start blank; written answers are kept.
					</p>
				</div>
			</div>
		);
	}

	if (state.status === 'NOT_STARTED') {
		return (
			<div className="mx-auto w-full max-w-xl space-y-5 pt-2">
				<Link href="/exams" className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-black">
					<ArrowLeft className="h-4 w-4" /> All exams
				</Link>
				<div className="space-y-4 rounded-3xl border-2 border-black bg-white p-6 shadow-hard">
					<h1 className="font-display text-3xl leading-tight">{state.exam.title}</h1>
					{state.exam.description && <p className="whitespace-pre-wrap text-sm text-slate-700">{state.exam.description}</p>}
					<ul className="space-y-1.5 text-sm font-medium">
						<li>• {state.exam.questionCount} questions</li>
						<li>• Time limit: {formatDuration(state.exam.durationMinutes)}{state.exam.durationMinutes !== null && ' (the timer starts when you press Start)'}</li>
						<li>
							• {state.exam.maxAttempts === 2
								? 'You may take this exam up to 2 times. After your 1st attempt you can choose to view your mark or try again.'
								: 'You have 1 attempt only.'}
						</li>
					</ul>
					<Button size="lg" className="w-full" disabled={isBusy} onClick={start}>
						{isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Start exam
					</Button>
				</div>
			</div>
		);
	}

	return <AttemptView key={`${state.attemptNumber}`} examId={examId} state={state} onFinished={load} />;
};

// ---------------------------------------------------------------------------

const AttemptView = ({
	examId,
	state,
	onFinished,
}: {
	examId: string;
	state: ExamRunState;
	onFinished: () => Promise<void>;
}) => {
	const [answers, setAnswers] = useState<ExamAnswers>(state.answers);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

	const answersRef = useRef(answers);
	answersRef.current = answers;
	const dirtyRef = useRef(false);
	const submittingRef = useRef(false);

	// Server clock offset so a wrong device clock can't shorten or extend the timer.
	const offsetRef = useRef(new Date(state.serverNow).getTime() - Date.now());
	const deadlineMs = state.deadline ? new Date(state.deadline).getTime() : null;

	const submit = useCallback(
		async (auto: boolean) => {
			if (submittingRef.current) return;
			submittingRef.current = true;
			setIsSubmitting(true);
			try {
				await api.post(`/api/exams/${examId}/submit`, { answers: answersRef.current });
				if (auto) toast('Time is up — your answers were submitted.');
			} catch (error) {
				toast.error(errorMessage(error, 'Could not submit. Please try again.'));
			} finally {
				submittingRef.current = false;
				setIsSubmitting(false);
				await onFinished();
			}
		},
		[examId, onFinished]
	);

	// Countdown
	useEffect(() => {
		if (deadlineMs === null) return;
		const tick = () => {
			const left = Math.ceil((deadlineMs - (Date.now() + offsetRef.current)) / 1000);
			setSecondsLeft(left);
			if (left <= 0) submit(true);
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [deadlineMs, submit]);

	// Autosave (debounced) so a refresh or lost connection doesn't lose answers.
	useEffect(() => {
		if (!dirtyRef.current) return;
		const id = setTimeout(() => {
			dirtyRef.current = false;
			api.put(`/api/exams/${examId}/answers`, { answers: answersRef.current }).catch(() => {
				dirtyRef.current = true;
			});
		}, 1200);
		return () => clearTimeout(id);
	}, [answers, examId]);

	const setAnswer = (questionId: string, patch: Record<string, unknown>) => {
		dirtyRef.current = true;
		setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...patch } }));
	};

	const unanswered = state.questions.filter((q) => {
		const a = answers[q.id];
		return q.type === 'MCQ' ? typeof a?.choice !== 'number' : !a?.text?.trim() && !a?.imageUrl;
	}).length;

	const onSubmitClick = () => {
		const message = unanswered
			? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. Submit anyway?`
			: 'Submit your answers?';
		if (window.confirm(message)) submit(false);
	};

	const warn = secondsLeft !== null && secondsLeft <= 60;

	return (
		<div className="mx-auto w-full max-w-3xl space-y-4 pb-24">
			<div className="sticky top-2 z-30 flex items-center justify-between gap-3 rounded-2xl border-2 border-black bg-white p-3 shadow-hard-sm md:top-4">
				<div className="min-w-0">
					<p className="truncate text-sm font-bold">{state.exam.title}</p>
					<p className="text-xs font-semibold text-slate-600">
						{attemptLabel(state.attemptNumber)}
						{state.exam.maxAttempts === 2 ? ' of 2' : ''}
					</p>
				</div>
				<div
					className={cn(
						'flex shrink-0 items-center gap-1.5 rounded-full border-2 border-black px-3 py-1 text-sm font-extrabold tabular-nums',
						warn ? 'bg-rose-300' : 'bg-primary'
					)}
				>
					<Clock className="h-4 w-4" />
					{secondsLeft === null ? 'No limit' : formatClock(secondsLeft)}
				</div>
			</div>

			{state.questions.map((q, index) => (
				<QuestionCard
					key={q.id}
					index={index}
					question={q}
					answer={answers[q.id]}
					disabled={isSubmitting}
					onChange={(patch) => setAnswer(q.id, patch)}
				/>
			))}

			<div className="flex justify-end">
				<Button size="lg" disabled={isSubmitting} onClick={onSubmitClick}>
					{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
					Submit answers
				</Button>
			</div>
		</div>
	);
};

const QuestionCard = ({
	index,
	question: q,
	answer,
	disabled,
	onChange,
}: {
	index: number;
	question: ExamRunQuestion;
	answer?: ExamAnswers[string];
	disabled: boolean;
	onChange: (patch: Record<string, unknown>) => void;
}) => (
	<div className="space-y-3 rounded-2xl border-2 border-black bg-white p-5 shadow-hard-sm">
		<div className="flex items-start justify-between gap-3">
			<p className="font-semibold leading-snug">
				<span className="mr-1.5 text-slate-500">Q{index + 1}.</span>
				{q.text}
			</p>
			<span className="shrink-0 text-xs font-bold text-slate-600">{q.points} pt{q.points > 1 ? 's' : ''}</span>
		</div>
		{q.imageUrl && (
			// eslint-disable-next-line @next/next/no-img-element
			<img src={q.imageUrl} alt="" className="max-h-64 rounded-xl border-2 border-black object-contain" />
		)}

		{q.type === 'MCQ' ? (
			<div className="space-y-2">
				{(q.choices ?? []).map((choice, cIndex) => {
					const selected = answer?.choice === cIndex;
					return (
						<button
							key={cIndex}
							type="button"
							disabled={disabled}
							onClick={() => onChange({ choice: cIndex })}
							className={cn(
								'flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-left text-sm transition-colors',
								selected ? 'border-black bg-primary font-semibold' : 'border-slate-300 bg-white hover:border-black'
							)}
						>
							<span
								className={cn(
									'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-black text-xs font-bold',
									selected ? 'bg-white' : 'bg-slate-50'
								)}
							>
								{choiceLabel(cIndex)}
							</span>
							<span className="min-w-0 break-words">{choice}</span>
						</button>
					);
				})}
			</div>
		) : (
			<div className="space-y-3">
				<Textarea
					value={answer?.text ?? ''}
					disabled={disabled}
					maxLength={MAX_WRITTEN_ANSWER_TEXT}
					onChange={(e) => onChange({ text: e.target.value })}
					placeholder="Type a short answer, or upload a photo of your handwritten answer below."
				/>
				{answer?.imageUrl ? (
					<div className="relative inline-block">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={answer.imageUrl} alt="Your handwritten answer" className="max-h-60 rounded-xl border-2 border-black object-contain" />
						<button
							type="button"
							aria-label="Remove photo"
							onClick={() => onChange({ imageUrl: null, imageKey: null })}
							className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white shadow-hard-sm"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				) : (
					<div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 p-3">
						<FileUpload
							endpoint="examAnswerImage"
							onChange={(url, meta) => {
								if (url) onChange({ imageUrl: url, imageKey: meta?.key ?? null });
							}}
						/>
					</div>
				)}
			</div>
		)}
	</div>
);
