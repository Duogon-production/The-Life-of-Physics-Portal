import { isValidImageUrl, normalizeOptionalImageUrl } from '@/shared/image-url';

/** Admin-configurable limits. Duration `null` means "Unlimited / No Time Limit". */
export const EXAM_ATTEMPT_OPTIONS = [1, 2] as const;
export const MIN_EXAM_DURATION_MINUTES = 1;
export const MAX_EXAM_DURATION_MINUTES = 1440;
export const EXAM_DURATION_PRESETS = [15, 30, 45, 60, 90, 120] as const;

export const EXAM_QUESTION_TYPES = ['MCQ', 'WRITTEN'] as const;
export type ExamQuestionType = (typeof EXAM_QUESTION_TYPES)[number];

export const MAX_EXAM_QUESTIONS = 100;
export const MIN_MCQ_CHOICES = 2;
export const MAX_MCQ_CHOICES = 6;
export const MAX_EXAM_TEXT = 8000;
export const MAX_CHOICE_TEXT = 500;
export const MAX_WRITTEN_ANSWER_TEXT = 5000;
export const MAX_QUESTION_POINTS = 100;
export const MAX_EXAM_TITLE = 200;
/** Extra seconds allowed after the deadline for network latency before answers are frozen. */
export const SUBMIT_GRACE_SECONDS = 20;

export const SESSION_STATUSES = ['IN_PROGRESS', 'AWAITING_DECISION', 'FINALIZED'] as const;
export type ExamSessionStatus = (typeof SESSION_STATUSES)[number];
export type WrittenStatus = 'NONE' | 'UNDER_CORRECTION' | 'GRADED';

export const CHOICE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const choiceLabel = (index: number) => CHOICE_LABELS[index] ?? String(index + 1);
export const attemptLabel = (attemptNumber: number) =>
	attemptNumber === 1 ? '1st Try' : attemptNumber === 2 ? '2nd Try' : `Try ${attemptNumber}`;

export const RETRY_PROMPT =
	'You have incorrect answers. Would you like to view your final mark now or take your 2nd attempt to solve again?';

export const formatDuration = (minutes: number | null) => {
	if (minutes === null) return 'No time limit';
	if (minutes < 60) return `${minutes} min`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${h} h ${m} min` : `${h} h`;
};

export interface ExamAnswer {
	choice?: number | null;
	text?: string | null;
	imageUrl?: string | null;
	imageKey?: string | null;
}
export type ExamAnswers = Record<string, ExamAnswer>;

export interface GradableQuestion {
	id: string;
	type: ExamQuestionType | string;
	choiceCount?: number;
	correctChoice: number | null;
	points: number;
}

/** Keeps only answers for real questions, with values clamped to what each question accepts. */
export function sanitizeAnswers(raw: unknown, questions: GradableQuestion[]): ExamAnswers {
	const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const clean: ExamAnswers = {};
	for (const question of questions) {
		const item = source[question.id];
		if (!item || typeof item !== 'object') continue;
		const value = item as Record<string, unknown>;
		if (question.type === 'MCQ') {
			const choice = value.choice;
			if (
				typeof choice === 'number' &&
				Number.isInteger(choice) &&
				choice >= 0 &&
				choice < (question.choiceCount ?? MAX_MCQ_CHOICES)
			) {
				clean[question.id] = { choice };
			}
		} else {
			const text =
				typeof value.text === 'string' && value.text.trim()
					? value.text.trim().slice(0, MAX_WRITTEN_ANSWER_TEXT)
					: null;
			const imageUrl = isValidImageUrl(value.imageUrl) ? value.imageUrl.trim() : null;
			const imageKey =
				imageUrl && typeof value.imageKey === 'string' ? value.imageKey.slice(0, 256) : null;
			if (text || imageUrl) clean[question.id] = { text, imageUrl, imageKey };
		}
	}
	return clean;
}

export interface McqScore {
	score: number;
	total: number;
	correctIds: string[];
	hasMistakes: boolean;
}

/** Unanswered MCQs count as mistakes. */
export function scoreMcq(questions: GradableQuestion[], answers: ExamAnswers): McqScore {
	let score = 0;
	let total = 0;
	const correctIds: string[] = [];
	for (const question of questions) {
		if (question.type !== 'MCQ') continue;
		total += question.points;
		const choice = answers[question.id]?.choice;
		if (typeof choice === 'number' && choice === question.correctChoice) {
			score += question.points;
			correctIds.push(question.id);
		}
	}
	const mcqCount = questions.filter((q) => q.type === 'MCQ').length;
	return { score, total, correctIds, hasMistakes: correctIds.length < mcqCount };
}

/**
 * A single-attempt exam, the last allowed attempt, or an attempt without MCQ
 * mistakes (a 100% MCQ score) is final straight away. Otherwise the student is
 * asked whether to retry.
 */
export function shouldAutoFinalize(input: {
	maxAttempts: number;
	attemptNumber: number;
	hasMistakes: boolean;
}) {
	return input.maxAttempts <= 1 || input.attemptNumber >= input.maxAttempts || !input.hasMistakes;
}

export interface ExamQuestionInput {
	type: ExamQuestionType;
	text: string;
	imageUrl: string | null;
	choices: string[] | null;
	correctChoice: number | null;
	points: number;
}

export interface ExamInput {
	title: string;
	description: string | null;
	durationMinutes: number | null;
	maxAttempts: 1 | 2;
	isPublished: boolean;
	questions: ExamQuestionInput[];
}

export type ParsedExam = { ok: true; value: ExamInput } | { ok: false; error: string };

const cleanText = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

export function parseExamInput(body: unknown): ParsedExam {
	const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

	const title = cleanText(data.title, MAX_EXAM_TITLE);
	if (!title) return { ok: false, error: 'An exam title is required.' };

	let durationMinutes: number | null = null;
	if (data.durationMinutes !== null && data.durationMinutes !== undefined) {
		const minutes = data.durationMinutes;
		if (
			typeof minutes !== 'number' ||
			!Number.isInteger(minutes) ||
			minutes < MIN_EXAM_DURATION_MINUTES ||
			minutes > MAX_EXAM_DURATION_MINUTES
		) {
			return {
				ok: false,
				error: `Duration must be between ${MIN_EXAM_DURATION_MINUTES} and ${MAX_EXAM_DURATION_MINUTES} minutes, or unlimited.`,
			};
		}
		durationMinutes = minutes;
	}

	if (data.maxAttempts !== 1 && data.maxAttempts !== 2) {
		return { ok: false, error: 'Max attempts must be 1 or 2.' };
	}

	if (!Array.isArray(data.questions) || data.questions.length === 0) {
		return { ok: false, error: 'Add at least one question.' };
	}
	if (data.questions.length > MAX_EXAM_QUESTIONS) {
		return { ok: false, error: `At most ${MAX_EXAM_QUESTIONS} questions are allowed.` };
	}

	const questions: ExamQuestionInput[] = [];
	for (let index = 0; index < data.questions.length; index++) {
		const item = (data.questions[index] ?? {}) as Record<string, unknown>;
		const label = `Question ${index + 1}`;
		const type = item.type;
		if (type !== 'MCQ' && type !== 'WRITTEN') {
			return { ok: false, error: `${label} has an invalid type.` };
		}
		const text = cleanText(item.text, MAX_EXAM_TEXT);
		if (!text) return { ok: false, error: `${label} needs question text.` };
		const imageUrl = normalizeOptionalImageUrl(item.imageUrl);
		if (imageUrl === undefined) {
			return { ok: false, error: `${label} has an invalid image URL (use a full http(s) link).` };
		}
		const points = item.points === undefined ? 1 : item.points;
		if (typeof points !== 'number' || !Number.isInteger(points) || points < 1 || points > MAX_QUESTION_POINTS) {
			return { ok: false, error: `${label} points must be a whole number from 1 to ${MAX_QUESTION_POINTS}.` };
		}

		if (type === 'MCQ') {
			if (!Array.isArray(item.choices)) return { ok: false, error: `${label} needs answer choices.` };
			const choices = item.choices.map((choice) => cleanText(choice, MAX_CHOICE_TEXT));
			if (choices.length < MIN_MCQ_CHOICES || choices.length > MAX_MCQ_CHOICES) {
				return { ok: false, error: `${label} needs ${MIN_MCQ_CHOICES} to ${MAX_MCQ_CHOICES} choices.` };
			}
			if (choices.some((choice) => choice === null)) {
				return { ok: false, error: `${label} has an empty choice.` };
			}
			const correct = item.correctChoice;
			if (typeof correct !== 'number' || !Number.isInteger(correct) || correct < 0 || correct >= choices.length) {
				return { ok: false, error: `${label} needs one correct choice selected.` };
			}
			questions.push({ type, text, imageUrl, choices: choices as string[], correctChoice: correct, points });
		} else {
			questions.push({ type, text, imageUrl, choices: null, correctChoice: null, points });
		}
	}

	return {
		ok: true,
		value: {
			title,
			description: cleanText(data.description, MAX_EXAM_TEXT),
			durationMinutes,
			maxAttempts: data.maxAttempts,
			isPublished: data.isPublished === true,
			questions,
		},
	};
}

/** Validates admin-entered written marks: every written question needs a mark from 0 to its points. */
export function parseWrittenScores(
	raw: unknown,
	writtenQuestions: { id: string; points: number }[]
): { ok: true; scores: Record<string, number>; total: number } | { ok: false; error: string } {
	const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	const scores: Record<string, number> = {};
	let total = 0;
	for (const question of writtenQuestions) {
		const value = source[question.id];
		if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > question.points) {
			return { ok: false, error: `Enter a mark between 0 and ${question.points} for every written question.` };
		}
		const rounded = Math.round(value * 100) / 100;
		scores[question.id] = rounded;
		total += rounded;
	}
	return { ok: true, scores, total: Math.round(total * 100) / 100 };
}
