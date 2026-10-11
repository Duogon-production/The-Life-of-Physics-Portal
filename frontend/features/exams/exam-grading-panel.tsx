'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/frontend/lib/api';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Textarea } from '@/frontend/components/ui/textarea';
import type { GradingEntry, GradingPayload } from '@/shared/contracts/exams';
import { cn } from '@/shared/utils';

interface ExamGradingPanelProps {
	examId: string;
	onClose: () => void;
}

export const ExamGradingPanel = ({ examId, onClose }: ExamGradingPanelProps) => {
	const [data, setData] = useState<GradingPayload | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const load = useCallback(async () => {
		try {
			const res = await api.get<GradingPayload>(`/api/exams/${examId}/grading`);
			setData(res.data);
		} catch {
			toast.error('Could not load written answers.');
		} finally {
			setIsLoading(false);
		}
	}, [examId]);

	useEffect(() => {
		load();
	}, [load]);

	return (
		<div className="mx-auto w-full max-w-4xl space-y-5 pb-12">
			<button type="button" onClick={onClose} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-black">
				<ArrowLeft className="h-4 w-4" /> Back to exams
			</button>
			<h1 className="font-display text-3xl">{data?.exam.title ?? 'Written answers'}</h1>

			{isLoading ? (
				<div className="flex justify-center py-16">
					<Loader2 className="h-6 w-6 animate-spin text-slate-500" />
				</div>
			) : !data || data.entries.length === 0 ? (
				<div className="rounded-2xl border-2 border-black bg-white p-6 text-center text-slate-600 shadow-hard-sm">
					No finished submissions with written questions yet.
				</div>
			) : data.writtenQuestions.length === 0 ? (
				<div className="rounded-2xl border-2 border-black bg-white p-6 text-center text-slate-600 shadow-hard-sm">
					This exam has no written questions.
				</div>
			) : (
				data.entries.map((entry) => (
					<GradingCard key={entry.sessionId} examId={examId} entry={entry} questions={data.writtenQuestions} onSaved={load} />
				))
			)}
		</div>
	);
};

const GradingCard = ({
	examId,
	entry,
	questions,
	onSaved,
}: {
	examId: string;
	entry: GradingEntry;
	questions: GradingPayload['writtenQuestions'];
	onSaved: () => void;
}) => {
	const [scores, setScores] = useState<Record<string, string>>(() =>
		Object.fromEntries(questions.map((q) => [q.id, entry.writtenScores[q.id] !== undefined ? String(entry.writtenScores[q.id]) : '']))
	);
	const [note, setNote] = useState(entry.reviewNote ?? '');
	const [isSaving, setIsSaving] = useState(false);
	const pending = entry.writtenStatus === 'UNDER_CORRECTION';

	const save = async () => {
		const parsed: Record<string, number> = {};
		for (const q of questions) {
			const value = scores[q.id];
			if (value === '' || value === undefined || Number.isNaN(Number(value))) {
				toast.error('Enter a mark for every written question.');
				return;
			}
			parsed[q.id] = Number(value);
		}
		try {
			setIsSaving(true);
			await api.patch(`/api/exams/${examId}/grading/${entry.sessionId}`, { scores: parsed, reviewNote: note });
			toast.success('Marks saved.');
			onSaved();
		} catch (error) {
			const message = (error as { response?: { data?: unknown } })?.response?.data;
			toast.error(typeof message === 'string' ? message : 'Could not save marks.');
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-4 rounded-2xl border-2 border-black bg-white p-5 shadow-hard-sm">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<p className="font-bold">{entry.studentName}</p>
					<p className="text-xs text-slate-600">
						{entry.studentEmail} · MCQ {entry.mcqScore}/{entry.mcqTotal}
					</p>
				</div>
				<span className={cn('rounded-full border-2 border-black px-2.5 py-0.5 text-xs font-semibold', pending ? 'bg-sky-200' : 'bg-primary')}>
					{pending ? 'Under Correction' : `Graded · ${entry.writtenScore}`}
				</span>
			</div>

			{questions.map((q) => {
				const answer = entry.answers[q.id];
				return (
					<div key={q.id} className="space-y-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
						<p className="text-sm font-semibold">
							Q{q.position}. {q.text}
						</p>
						{answer?.text && <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2.5 text-sm">{answer.text}</p>}
						{answer?.imageUrl && (
							<a href={answer.imageUrl} target="_blank" rel="noreferrer" className="block">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={answer.imageUrl} alt="Handwritten answer" className="max-h-80 rounded-lg border-2 border-black object-contain" />
								<span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
									<ExternalLink className="h-3 w-3" /> Open full size
								</span>
							</a>
						)}
						{!answer?.text && !answer?.imageUrl && <p className="text-sm italic text-slate-500">No answer given.</p>}
						<div className="flex items-center gap-2">
							<Input
								type="number"
								min={0}
								max={q.points}
								step="0.5"
								value={scores[q.id] ?? ''}
								onChange={(e) => setScores((prev) => ({ ...prev, [q.id]: e.target.value }))}
								className="w-24"
							/>
							<span className="text-sm text-slate-600">/ {q.points}</span>
						</div>
					</div>
				);
			})}

			<Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Feedback for the student (optional)" />
			<Button onClick={save} disabled={isSaving}>
				{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
				{pending ? 'Save marks' : 'Update marks'}
			</Button>
		</div>
	);
};
