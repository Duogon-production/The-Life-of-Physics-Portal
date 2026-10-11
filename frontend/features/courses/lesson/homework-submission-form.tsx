'use client';

import FileUpload from '@/frontend/components/file-upload';
import { api } from '@/frontend/lib/api';
import { CheckCircle, MessageSquare as MessageSquareText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useGlobalLoading } from '@/frontend/components/providers/loading-provider';

interface HomeworkSubmissionFormProps {
	courseId: string;
	chapterId: string;
	hasSubmission: boolean;
	reviewNote?: string | null;
	submissionStatus?: string | null;
	onSubmitted: () => void;
}

const HomeworkSubmissionForm = ({
	courseId,
	chapterId,
	hasSubmission,
	reviewNote = null,
	submissionStatus = null,
	onSubmitted,
}: HomeworkSubmissionFormProps) => {
	const router = useRouter();
	const [isSaving, setIsSaving] = useState(false);
	const { startLoading, stopLoading } = useGlobalLoading();

	const onUploadComplete = async (
		fileUrl?: string,
		metadata?: { size?: number; key?: string }
	) => {
		if (!fileUrl) return;

		try {
			setIsSaving(true);
			startLoading('Saving changes...');
			await api.post(
				`/api/courses/${courseId}/chapters/${chapterId}/homework-submissions`,
				{
					fileUrl,
					fileSize: metadata?.size,
					fileKey: metadata?.key,
				}
			);
			onSubmitted();
			router.refresh();
			toast.success('Homework submitted. The solution video is now unlocked.');
		} catch (error) {
			toast.error('Your homework could not be saved. Please try again.');
		} finally {
			setIsSaving(false);
			stopLoading();
		}
	};

	return (
		<div className="space-y-6">
			<div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 leading-relaxed">
				Upload a clear photo or PDF of your completed textbook homework. Submitting a
				file unlocks the solution video for this lesson.
			</div>

			{hasSubmission && (
				<div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 font-medium">
					<CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
					<span>Homework submitted! You can upload a replacement file anytime if needed.</span>
				</div>
			)}

			{hasSubmission && submissionStatus === 'APPROVED' && (
				<div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
					<CheckCircle className="h-4 w-4" /> Approved by your teacher
				</div>
			)}

			{reviewNote && (
				<div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800">
					<div className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800">
						<MessageSquareText className="h-4 w-4" /> Teacher feedback
					</div>
					<p className="whitespace-pre-wrap leading-relaxed">{reviewNote}</p>
				</div>
			)}

			<div className={isSaving ? 'pointer-events-none opacity-60' : ''}>
				<div className="rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50 p-4 transition-colors">
					<FileUpload endpoint="homeworkSubmission" onChange={onUploadComplete} />
				</div>
			</div>
		</div>
	);
};

export default HomeworkSubmissionForm;
