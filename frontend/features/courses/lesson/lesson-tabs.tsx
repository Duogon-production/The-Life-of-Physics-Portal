'use client';

import { formatChapterLabel } from '@/shared/chapter-label';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	ArrowLeft,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ClipboardCheck,
	Download,
	FileText,
	Layers,
	Lock,
	PlayCircle,
	Video,
} from 'lucide-react';

import { Preview } from '@/frontend/components/preview';
import { Button } from '@/frontend/components/ui/button';
import { cn } from '@/shared/utils';
import { getEmbeddableVideoUrl } from '@/shared/video-embed';
import { resolveSegmentContentType, type SegmentContentType } from '@/shared/segment';
import { TextbookWaveTopRight } from '@/frontend/components/textbook-accent';

import HomeworkQuestionsList from '@/frontend/features/courses/lesson/homework-questions-list';
import type { HomeworkQuestion } from '@/shared/contracts/courses';
import HomeworkSubmissionForm from '@/frontend/features/courses/lesson/homework-submission-form';
import VideoPlayer from '@/frontend/features/courses/lesson/video-player';

export interface LessonSegmentItem {
	id: string;
	title: string;
	position: number;
	contentType?: string | null;
	videoUrl?: string | null;
	solutionVideoUrl?: string | null;
	isCompleted?: boolean;
}

interface LessonTabsProps {
	courseId: string;
	chapterId: string;
	title: string;
	chapterNumber?: number | null;
	chapterType?: string | null;
	courseTitle?: string;
	description: string | null;
	playbackId: string | null | undefined;
	videoUrl: string | null;
	solutionVideoUrl: string | null;
	contentType?: string | null;
	nextChapterId?: string;
	completeOnEnd: boolean;
	isCompleted: boolean;
	isWatched: boolean;
	userId: string;
	hasSubmission: boolean;
	reviewNote?: string | null;
	submissionStatus?: string | null;
	homeworkMode?: string | null;
	homeworkQuestions?: HomeworkQuestion[];
	attachments: { id: string; name: string; url: string }[];
	segments: LessonSegmentItem[];
}

const LessonTabs = ({
	courseId,
	chapterId,
	title,
	chapterNumber,
	chapterType,
	courseTitle,
	description,
	playbackId,
	videoUrl,
	solutionVideoUrl,
	contentType,
	nextChapterId,
	completeOnEnd,
	isCompleted,
	isWatched,
	userId,
	hasSubmission: initialHasSubmission,
	reviewNote = null,
	submissionStatus = null,
	homeworkMode = 'FILE_UPLOAD',
	homeworkQuestions = [],
	attachments,
	segments,
}: LessonTabsProps) => {
	const router = useRouter();
	const [hasSubmission, setHasSubmission] = useState(initialHasSubmission);
	const [isMobilePlaylistOpen, setIsMobilePlaylistOpen] = useState(false);

	// Resolve the active segment content type
	const activeContentType: SegmentContentType = resolveSegmentContentType({
		contentType,
		solutionVideoUrl,
		videoUrl,
		title,
	});

	const embedUrl = getEmbeddableVideoUrl(videoUrl);
	const solutionEmbedUrl = getEmbeddableVideoUrl(solutionVideoUrl);

	// Find currentIndex in segments playlist
	const currentSegmentIndex = segments.findIndex((s) => s.id === chapterId);
	const prevSegment =
		currentSegmentIndex > 0 ? segments[currentSegmentIndex - 1] : null;
	const nextSegment =
		currentSegmentIndex >= 0 && currentSegmentIndex < segments.length - 1
			? segments[currentSegmentIndex + 1]
			: null;

	const completedCount = segments.filter((s) => s.isCompleted).length;

	const onHomeworkSubmitted = () => {
		setHasSubmission(true);
		router.refresh();
	};

	return (
		<div className="space-y-6 animate-in fade-in-50 duration-200">
			{/* Top Bar: Back to Home + Lesson Info */}
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
				<Link
					href="/home"
					className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors"
				>
					<ArrowLeft className="h-4 w-4" />
					<span>Back to Home</span>
				</Link>

				<div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
					<span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 border border-sky-200/80">
						{formatChapterLabel(chapterType, chapterNumber)}
					</span>
					{courseTitle && (
						<>
							<span>·</span>
							<span className="truncate max-w-xs">{courseTitle}</span>
						</>
					)}
				</div>
			</div>

			{/* Main Grid: Player on left, Sticky Playlist on right */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
				{/* LEFT COLUMN: Main Segment Content (lg:col-span-8) */}
				<div className="lg:col-span-8 space-y-6">
					<div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
						<TextbookWaveTopRight opacity={0.2} />
						{/* Segment Header */}
						<div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-5">
							<div className="space-y-1.5">
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-xs font-bold uppercase tracking-wider text-slate-500">
										Segment {currentSegmentIndex >= 0 ? currentSegmentIndex + 1 : 1} of{' '}
										{segments.length || 1}
									</span>
									<span className="text-slate-300">·</span>

									{activeContentType === 'VIDEO_EXPLANATION' ? (
										<span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 border border-sky-200/80">
											<Video className="h-3.5 w-3.5" />
											Video Explanation
										</span>
									) : (
										<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200/80">
											<ClipboardCheck className="h-3.5 w-3.5" />
											Homework Assignment
										</span>
									)}
								</div>

								<h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
									{title}
								</h1>
							</div>
						</div>

						{/* Mobile Segment Switcher Accordion */}
						<div className="lg:hidden border border-slate-200 rounded-xl bg-slate-50/70 p-3">
							<button
								type="button"
								onClick={() => setIsMobilePlaylistOpen((v) => !v)}
								className="flex w-full items-center justify-between text-xs font-semibold text-slate-700"
							>
								<div className="flex items-center gap-2">
									<Layers className="h-4 w-4 text-sky-600" />
									<span>
										Playlist ({currentSegmentIndex + 1}/{segments.length}): {title}
									</span>
								</div>
								<ChevronDown
									className={cn(
										'h-4 w-4 text-slate-500 transition-transform',
										isMobilePlaylistOpen && 'rotate-180'
									)}
								/>
							</button>

							{isMobilePlaylistOpen && (
								<div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
									{segments.map((seg, idx) => {
										const segType = resolveSegmentContentType(seg);
										const isActive = seg.id === chapterId;
										return (
											<Link
												key={seg.id}
												href={`/courses/${courseId}/chapters/${seg.id}`}
												onClick={() => setIsMobilePlaylistOpen(false)}
												className={cn(
													'flex items-center justify-between rounded-lg p-2.5 text-xs font-medium transition',
													isActive
														? 'bg-sky-100 text-sky-900 font-bold'
														: 'bg-white hover:bg-slate-100 text-slate-700'
												)}
											>
												<div className="flex items-center gap-2 truncate pr-2">
													{segType === 'VIDEO_EXPLANATION' ? (
														<Video className="h-3.5 w-3.5 shrink-0 text-sky-600" />
													) : (
														<ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-amber-600" />
													)}
													<span className="truncate">
														Segment {idx + 1}: {seg.title}
													</span>
												</div>
												{seg.isCompleted && (
													<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
												)}
											</Link>
										);
									})}
								</div>
							)}
						</div>

						{/* =========================================================================
						    STRICT SEGMENT CONTENT TYPE SEPARATION
						    ========================================================================= */}

						{/* 1. IF CONTENT TYPE == "VIDEO_EXPLANATION" */}
						{activeContentType === 'VIDEO_EXPLANATION' && (
							<div className="space-y-6">
								{/* Video Player */}
								<div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-sm">
									{playbackId ? (
										<VideoPlayer
											chapterId={chapterId}
											completeOnEnd={completeOnEnd}
											courseId={courseId}
											hasWatched={isWatched}
											nextChapterId={nextChapterId}
											playbackId={playbackId}
											title={title}
										/>
									) : embedUrl ? (
										<iframe
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
											className="aspect-video w-full rounded-xl bg-black"
											src={embedUrl}
											title={`${title} explanation video`}
										/>
									) : videoUrl ? (
										<video
											controls
											className="aspect-video w-full rounded-xl bg-black"
											src={videoUrl}
										/>
									) : (
										<div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-slate-900 text-slate-400">
											<PlayCircle className="h-12 w-12 text-slate-600" />
											<p className="text-sm font-medium">
												The explanation video for this segment is not available yet.
											</p>
										</div>
									)}
								</div>

								{/* Segment Text Explanation / Description */}
								{description && (
									<div className="rounded-xl border border-slate-100 bg-slate-50/60 p-5 text-slate-800 leading-relaxed text-sm sm:text-base">
										<Preview value={description} />
									</div>
								)}

								{/* Downloadable PDF Notes & Resource Attachments list */}
								{attachments.length > 0 && (
									<div className="space-y-3 pt-2">
										<h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
											Downloadable PDF Notes &amp; Resources ({attachments.length})
										</h2>
										<div className="grid gap-3 sm:grid-cols-2">
											{attachments.map((attachment) => (
												<a
													key={attachment.id}
													href={attachment.url}
													target="_blank"
													rel="noreferrer"
													download
													className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 p-3.5 transition group"
												>
													<div className="flex items-center gap-3 min-w-0 pr-2">
														<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
															<FileText className="h-5 w-5" />
														</div>
														<span className="truncate text-sm font-semibold text-slate-800 group-hover:text-slate-950">
															{attachment.name}
														</span>
													</div>
													<Download className="h-4 w-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
												</a>
											))}
										</div>
									</div>
								)}
							</div>
						)}

						{/* 2. IF CONTENT TYPE == "HOMEWORK_ASSIGNMENT" */}
						{activeContentType === 'HOMEWORK_ASSIGNMENT' && (
							<div className="space-y-8">
								{homeworkMode === 'PLATFORM_QUESTIONS' && (
									<HomeworkQuestionsList
										questions={homeworkQuestions}
										hasSubmission={hasSubmission}
									/>
								)}

								{/* Homework Submission Dropzone */}
								<div className="space-y-4">
									<div className="flex items-center gap-2 text-slate-900 font-bold text-base">
										<ClipboardCheck className="h-5 w-5 text-amber-600" />
										<span>Textbook Homework Submission</span>
									</div>

									<HomeworkSubmissionForm
										chapterId={chapterId}
										courseId={courseId}
										hasSubmission={hasSubmission}
										reviewNote={reviewNote}
										submissionStatus={submissionStatus}
										onSubmitted={onHomeworkSubmitted}
									/>
								</div>

								{/* Unlocked Homework Solution Video Player */}
								<div className="border-t border-slate-200 pt-6 space-y-4">
									<div className="flex items-center gap-2 text-slate-900 font-bold text-base">
										<PlayCircle className="h-5 w-5 text-sky-600" />
										<span>Homework Solution Walkthrough</span>
									</div>

									{!hasSubmission ? (
										<div className="flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
											<div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
												<Lock className="h-6 w-6" />
											</div>
											<h2 className="text-base font-bold text-slate-900">
												Solution Video is Locked
											</h2>
											<p className="max-w-md text-sm text-slate-500 leading-relaxed">
												Upload a clear photo or PDF of your completed textbook homework above to immediately unlock the solution walkthrough video.
											</p>
										</div>
									) : solutionEmbedUrl ? (
										<div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 bg-black shadow-sm">
											<iframe
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
												allowFullScreen
												className="aspect-video w-full bg-black"
												src={solutionEmbedUrl}
												title={`${title} solution video`}
											/>
										</div>
									) : solutionVideoUrl ? (
										<video
											controls
											className="aspect-video w-full rounded-xl border border-slate-200 bg-black shadow-sm"
											src={solutionVideoUrl}
										/>
									) : (
										<div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
											<p className="text-sm font-medium">
												Your homework is submitted! The teacher has not uploaded the solution video for this assignment yet.
											</p>
										</div>
									)}
								</div>
							</div>
						)}

						{/* Previous / Next Segment Quick Buttons */}
						<div className="border-t border-slate-100 pt-5 flex items-center justify-between">
							{prevSegment ? (
								<Link
									href={`/courses/${courseId}/chapters/${prevSegment.id}`}
									className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
								>
									<ChevronLeft className="h-4 w-4" />
									<span>Previous: Segment {currentSegmentIndex}</span>
								</Link>
							) : (
								<div />
							)}

							{nextSegment && (
								<Link
									href={`/courses/${courseId}/chapters/${nextSegment.id}`}
									className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition ml-auto"
								>
									<span>Next: Segment {currentSegmentIndex + 2}</span>
									<ChevronRight className="h-4 w-4" />
								</Link>
							)}
						</div>
					</div>
				</div>

				{/* RIGHT COLUMN: Dedicated Lesson Segment Navigation Playlist (lg:col-span-4) */}
				<div className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
					<div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
						{/* Playlist Header */}
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div className="space-y-0.5">
								<h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
									Lesson Segments
								</h2>
								<p className="text-xs text-slate-500">
									{completedCount} of {segments.length} completed
								</p>
							</div>

							<div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
								{segments.length} {segments.length === 1 ? 'part' : 'parts'}
							</div>
						</div>

						{/* Segment Playlist Item List (1-tap switch) */}
						<div className="space-y-2 max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
							{segments.map((seg, idx) => {
								const segType = resolveSegmentContentType(seg);
								const isActive = seg.id === chapterId;

								return (
									<Link
										key={seg.id}
										href={`/courses/${courseId}/chapters/${seg.id}`}
										className={cn(
											'group flex items-start justify-between gap-3 rounded-xl p-3.5 text-left transition-all duration-150 border',
											isActive
												? 'bg-sky-50/80 border-sky-300 text-sky-950 shadow-xs ring-1 ring-sky-200'
												: 'border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-200 text-slate-700'
										)}
									>
										<div className="flex items-start gap-3 min-w-0">
											<div
												className={cn(
													'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-bold transition-colors mt-0.5',
													isActive
														? 'bg-sky-600 text-white'
														: 'bg-white border border-slate-200 text-slate-600 group-hover:bg-slate-50'
												)}
											>
												{idx + 1}
											</div>

											<div className="space-y-1 min-w-0">
												<div className="flex items-center gap-1.5 text-[11px] font-semibold">
													{segType === 'VIDEO_EXPLANATION' ? (
														<span className="inline-flex items-center gap-1 text-sky-700">
															<Video className="h-3 w-3" />
															Explanation
														</span>
													) : (
														<span className="inline-flex items-center gap-1 text-amber-700">
															<ClipboardCheck className="h-3 w-3" />
															Homework
														</span>
													)}
												</div>

												<p
													className={cn(
														'text-xs font-semibold line-clamp-2 leading-relaxed',
														isActive ? 'text-sky-950 font-bold' : 'text-slate-800'
													)}
												>
													{seg.title}
												</p>
											</div>
										</div>

										<div className="shrink-0 mt-1">
											{seg.isCompleted ? (
												<CheckCircle2 className="h-4 w-4 text-emerald-600" />
											) : (
												<ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
											)}
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LessonTabs;
