'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Lock, PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/frontend/lib/api';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import type { ExamEditable, ExamEditableQuestion } from '@/shared/contracts/exams';
import {
	EXAM_DURATION_PRESETS,
	MAX_EXAM_DURATION_MINUTES,
	MAX_MCQ_CHOICES,
	MIN_EXAM_DURATION_MINUTES,
	MIN_MCQ_CHOICES,
	choiceLabel,
} from '@/shared/exams';
import { cn } from '@/shared/utils';

interface ExamBuilderProps {
	examId: string | null;
	onClose: (changed: boolean) => void;
}

const blankMcq = (): ExamEditableQuestion => ({
	type: 'MCQ',
	text: '',
	imageUrl: null,
	choices: ['', '', '', ''],
	correctChoice: 0,
	points: 1,
});

const blankWritten = (): ExamEditableQuestion => ({
	type: 'WRITTEN',
	text: '',
	imageUrl: null,
	choices: null,
	correctChoice: null,
	points: 5,
});

const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600';
const panelClass = 'rounded-2xl border-2 border-black bg-white p-5 shadow-hard-sm';

export const ExamBuilder = ({ examId, onClose }: ExamBuilderProps) => {
	const [isLoading, setIsLoading] = useState(!!examId);
	const [isSaving, setIsSaving] = useState(false);
	const [isLocked, setIsLocked] = useState(false);

	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [unlimited, setUnlimited] = useState(false);
	const [minutes, setMinutes] = useState('60');
	const [maxAttempts, setMaxAttempts] = useState<1 | 2>(1);
	const [isPublished, setIsPublished] = useState(false);
	const [questions, setQuestions] = useState<ExamEditableQuestion[]>([blankMcq()]);

	useEffect(() => {
		if (!examId) return;
		api
			.get<ExamEditable>(`/api/exams/${examId}`)
			.then(({ data }) => {
				setTitle(data.title);
				setDescription(data.description ?? '');
				setUnlimited(data.durationMinutes === null);
				setMinutes(String(data.durationMinutes ?? 60));
				setMaxAttempts(data.maxAttempts);
				setIsPublished(data.isPublished);
				setIsLocked(data.isLocked);
				setQuestions(data.questions);
			})
			.catch(() => {
				toast.error('Could not load the exam.');
				onClose(false);
			})
			.finally(() => setIsLoading(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [examId]);

	const patchQuestion = (index: number, patch: Partial<ExamEditableQuestion>) =>
		setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));

	const setChoice = (qIndex: number, cIndex: number, value: string) =>
		setQuestions((prev) =>
			prev.map((q, i) =>
				i === qIndex ? { ...q, choices: (q.choices ?? []).map((c, j) => (j === cIndex ? value : c)) } : q
			)
		);

	const addChoice = (qIndex: number) =>
		setQuestions((prev) =>
			prev.map((q, i) => (i === qIndex && (q.choices?.length ?? 0) < MAX_MCQ_CHOICES ? { ...q, choices: [...(q.choices ?? []), ''] } : q))
		);

	const removeChoice = (qIndex: number, cIndex: number) =>
		setQuestions((prev) =>
			prev.map((q, i) => {
				if (i !== qIndex || (q.choices?.length ?? 0) <= MIN_MCQ_CHOICES) return q;
				const choices = (q.choices ?? []).filter((_, j) => j !== cIndex);
				let correct = q.correctChoice ?? 0;
				if (cIndex === correct) correct = 0;
				else if (cIndex < correct) correct -= 1;
				return { ...q, choices, correctChoice: correct };
			})
		);

	const save = async () => {
		const minutesNumber = Number(minutes);
		if (!unlimited && (!Number.isInteger(minutesNumber) || minutesNumber < MIN_EXAM_DURATION_MINUTES || minutesNumber > MAX_EXAM_DURATION_MINUTES)) {
			toast.error(`Duration must be ${MIN_EXAM_DURATION_MINUTES}–${MAX_EXAM_DURATION_MINUTES} minutes, or unlimited.`);
			return;
		}
		const payload = {
			title,
			description,
			durationMinutes: unlimited ? null : minutesNumber,
			maxAttempts,
			isPublished,
			questions: questions.map((q) => ({
				type: q.type,
				text: q.text,
				imageUrl: q.imageUrl ?? '',
				choices: q.choices,
				correctChoice: q.correctChoice,
				points: q.points,
			})),
		};
		try {
			setIsSaving(true);
			if (examId) await api.put(`/api/exams/${examId}`, payload);
			else await api.post('/api/exams', payload);
			toast.success('Exam saved.');
			onClose(true);
		} catch (error) {
			const message =
				typeof (error as { response?: { data?: unknown } })?.response?.data === 'string'
					? ((error as { response: { data: string } }).response.data)
					: 'Could not save the exam.';
			toast.error(message);
		} finally {
			setIsSaving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex justify-center py-16">
				<Loader2 className="h-6 w-6 animate-spin text-slate-500" />
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-3xl space-y-5 pb-16">
			<button type="button" onClick={() => onClose(false)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-black">
				<ArrowLeft className="h-4 w-4" /> Back to exams
			</button>

			<h1 className="font-display text-3xl">{examId ? 'Edit exam' : 'New exam'}</h1>

			{isLocked && (
				<div className="flex items-start gap-2.5 rounded-2xl border-2 border-black bg-amber-100 p-4 text-sm">
					<Lock className="mt-0.5 h-4 w-4 shrink-0" />
					<span>
						Students have already started this exam, so questions, duration and attempt limit are locked to protect their answer history. You can still change the title, description and published state.
					</span>
				</div>
			)}

			<div className={cn(panelClass, 'space-y-4')}>
				<div>
					<label className={labelClass}>Title</label>
					<Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 3 – Kinematics Exam" maxLength={200} />
				</div>
				<div>
					<label className={labelClass}>Description (optional)</label>
					<Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Instructions shown to students before they start." />
				</div>

				<div className={cn('grid gap-4 sm:grid-cols-2', isLocked && 'pointer-events-none opacity-60')}>
					<div>
						<label className={labelClass}>Time limit (per attempt)</label>
						<div className="flex flex-wrap items-center gap-2">
							<Input
								type="number"
								min={MIN_EXAM_DURATION_MINUTES}
								max={MAX_EXAM_DURATION_MINUTES}
								value={minutes}
								disabled={unlimited}
								onChange={(e) => setMinutes(e.target.value)}
								className="w-24"
							/>
							<span className="text-sm text-slate-600">minutes</span>
						</div>
						<div className="mt-2 flex flex-wrap gap-1.5">
							{EXAM_DURATION_PRESETS.map((preset) => (
								<button
									key={preset}
									type="button"
									onClick={() => {
										setUnlimited(false);
										setMinutes(String(preset));
									}}
									className="rounded-full border-2 border-black bg-white px-2.5 py-0.5 text-xs font-semibold hover:bg-primary"
								>
									{preset}
								</button>
							))}
							<button
								type="button"
								onClick={() => setUnlimited(true)}
								className={cn('rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-semibold', unlimited ? 'bg-primary' : 'bg-white hover:bg-primary')}
							>
								Unlimited
							</button>
						</div>
					</div>
					<div>
						<label className={labelClass}>Max attempts</label>
						<div className="flex gap-2">
							{([1, 2] as const).map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setMaxAttempts(n)}
									className={cn(
										'flex-1 rounded-xl border-2 border-black px-4 py-2 text-sm font-semibold',
										maxAttempts === n ? 'bg-primary shadow-hard-sm' : 'bg-white hover:bg-slate-100'
									)}
								>
									{n} attempt{n > 1 ? 's' : ''}
								</button>
							))}
						</div>
						{maxAttempts === 2 && (
							<p className="mt-2 text-xs text-slate-600">
								Students with mistakes after attempt 1 are asked whether to view their mark or retry. They are never told which questions were wrong.
							</p>
						)}
					</div>
				</div>

				<label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
					<input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 accent-black" />
					Published (visible to students)
				</label>
			</div>

			<div className={cn('space-y-4', isLocked && 'pointer-events-none opacity-60')}>
				{questions.map((q, qIndex) => (
					<div key={q.id ?? qIndex} className={cn(panelClass, 'space-y-3')}>
						<div className="flex items-center justify-between gap-2">
							<span className="rounded-full border-2 border-black bg-primary px-2.5 py-0.5 text-xs font-bold">
								Q{qIndex + 1} · {q.type === 'MCQ' ? 'Multiple choice' : 'Written / essay'}
							</span>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								aria-label="Remove question"
								onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qIndex))}
							>
								<Trash2 className="h-4 w-4 text-rose-600" />
							</Button>
						</div>
						<Textarea value={q.text} onChange={(e) => patchQuestion(qIndex, { text: e.target.value })} placeholder="Question text" />
						<Input
							value={q.imageUrl ?? ''}
							onChange={(e) => patchQuestion(qIndex, { imageUrl: e.target.value })}
							placeholder="Image URL (optional, full https link)"
						/>

						{q.type === 'MCQ' && (
							<div className="space-y-2">
								{(q.choices ?? []).map((choice, cIndex) => (
									<div key={cIndex} className="flex items-center gap-2">
										<button
											type="button"
											aria-label={`Mark choice ${choiceLabel(cIndex)} correct`}
											onClick={() => patchQuestion(qIndex, { correctChoice: cIndex })}
											className={cn(
												'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black text-sm font-bold',
												q.correctChoice === cIndex ? 'bg-emerald-400' : 'bg-white hover:bg-slate-100'
											)}
										>
											{choiceLabel(cIndex)}
										</button>
										<Input value={choice} onChange={(e) => setChoice(qIndex, cIndex, e.target.value)} placeholder={`Choice ${choiceLabel(cIndex)}`} />
										<Button
											type="button"
											size="sm"
											variant="ghost"
											aria-label="Remove choice"
											disabled={(q.choices?.length ?? 0) <= MIN_MCQ_CHOICES}
											onClick={() => removeChoice(qIndex, cIndex)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
								<div className="flex items-center justify-between">
									<span className="text-xs text-slate-600">Tap a letter to set the correct answer (green).</span>
									{(q.choices?.length ?? 0) < MAX_MCQ_CHOICES && (
										<Button type="button" size="sm" variant="outline" onClick={() => addChoice(qIndex)}>
											Add choice
										</Button>
									)}
								</div>
							</div>
						)}

						<div className="flex items-center gap-2">
							<label className="text-xs font-bold uppercase tracking-wider text-slate-600">Points</label>
							<Input
								type="number"
								min={1}
								max={100}
								value={q.points}
								onChange={(e) => patchQuestion(qIndex, { points: Number(e.target.value) })}
								className="w-20"
							/>
						</div>
					</div>
				))}

				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" onClick={() => setQuestions((prev) => [...prev, blankMcq()])}>
						<PlusCircle className="mr-2 h-4 w-4" /> Multiple choice
					</Button>
					<Button type="button" variant="outline" onClick={() => setQuestions((prev) => [...prev, blankWritten()])}>
						<PlusCircle className="mr-2 h-4 w-4" /> Written / essay
					</Button>
				</div>
			</div>

			<div className="sticky bottom-3 flex justify-end gap-2 rounded-2xl border-2 border-black bg-white p-3 shadow-hard-sm">
				<Button variant="outline" onClick={() => onClose(false)} disabled={isSaving}>
					Cancel
				</Button>
				<Button onClick={save} disabled={isSaving}>
					{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Save exam
				</Button>
			</div>
		</div>
	);
};
