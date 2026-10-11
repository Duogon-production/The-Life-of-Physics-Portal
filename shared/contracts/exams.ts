import type {
	ExamAnswer,
	ExamAnswers,
	ExamQuestionType,
	ExamSessionStatus,
	WrittenStatus,
} from '@/shared/exams';

export type StudentExamState =
	| 'NOT_STARTED'
	| 'IN_PROGRESS'
	| 'AWAITING_DECISION'
	| 'UNDER_CORRECTION'
	| 'GRADED'
	| 'SUBMITTED';

export interface ExamSummary {
	id: string;
	title: string;
	description: string | null;
	durationMinutes: number | null;
	maxAttempts: 1 | 2;
	isPublished: boolean;
	questionCount: number;
	/** Student view only. */
	state?: StudentExamState;
	mcqScore?: number | null;
	mcqTotal?: number | null;
	totalScore?: number | null;
	totalPossible?: number | null;
	/** Staff view only. */
	sessionCount?: number;
	underCorrectionCount?: number;
}

/** A question as shown to a student while taking the exam. The answer key is never included. */
export interface ExamRunQuestion {
	id: string;
	position: number;
	type: ExamQuestionType;
	text: string;
	imageUrl: string | null;
	choices: string[] | null;
	points: number;
}

export interface ExamRunState {
	role: 'student';
	exam: {
		id: string;
		title: string;
		description: string | null;
		durationMinutes: number | null;
		maxAttempts: 1 | 2;
		questionCount: number;
	};
	status: 'NOT_STARTED' | ExamSessionStatus;
	attemptNumber: number;
	/** ISO deadline of the current attempt; null when the exam has no time limit. */
	deadline: string | null;
	serverNow: string;
	questions: ExamRunQuestion[];
	answers: ExamAnswers;
	writtenStatus: WrittenStatus;
}

export interface ExamEditableQuestion {
	id?: string;
	type: ExamQuestionType;
	text: string;
	imageUrl: string | null;
	choices: string[] | null;
	correctChoice: number | null;
	points: number;
}

export interface ExamEditable {
	role: 'staff';
	id: string;
	title: string;
	description: string | null;
	durationMinutes: number | null;
	maxAttempts: 1 | 2;
	isPublished: boolean;
	/** Questions and attempt limits are locked once a student has started. */
	isLocked: boolean;
	questions: ExamEditableQuestion[];
}

export interface ResultAttemptPick {
	attemptNumber: number;
	choice: number | null;
}

export interface ExamResultQuestion {
	id: string;
	position: number;
	type: ExamQuestionType;
	text: string;
	imageUrl: string | null;
	choices: string[] | null;
	points: number;
	/** MCQ only. */
	correctChoice: number | null;
	picks: ResultAttemptPick[];
	isCorrect: boolean | null;
	/** Written only (taken from the final attempt). */
	written: ExamAnswer | null;
	writtenScore: number | null;
}

export interface ExamResult {
	examId: string;
	title: string;
	attemptsUsed: number;
	maxAttempts: 1 | 2;
	mcqScore: number;
	mcqTotal: number;
	writtenStatus: WrittenStatus;
	writtenScore: number | null;
	writtenTotal: number;
	reviewNote: string | null;
	finalizedAt: string | null;
	questions: ExamResultQuestion[];
}

export interface GradingEntry {
	sessionId: string;
	studentName: string;
	studentEmail: string;
	writtenStatus: WrittenStatus;
	writtenScore: number | null;
	writtenScores: Record<string, number>;
	reviewNote: string | null;
	finalizedAt: string | null;
	mcqScore: number;
	mcqTotal: number;
	answers: Record<string, ExamAnswer>;
}

export interface GradingPayload {
	exam: { id: string; title: string };
	writtenQuestions: { id: string; position: number; text: string; imageUrl: string | null; points: number }[];
	entries: GradingEntry[];
}
