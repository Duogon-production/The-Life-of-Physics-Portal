/**
 * Supabase-backed exam listing contract (Delivery 1 – read-only foundation).
 *
 * An "exam" in the V2 data model is an `offering_assessments` row (a published
 * assessment scheduled for one course offering). `id` below is therefore the
 * offering_assessment id, which is what `start_assessment_attempt` expects.
 *
 * Everything here is derived ONLY from data a student can already read through
 * RLS (offering_assessments, assessments, own assessment_attempts, question
 * counts). Retry decisions, finalization and answer review are NOT represented
 * because the backend has no contract for them yet (see CHANGELOG_FOR_MERGE.md).
 */

export type ExamAttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'void';

export interface ExamAttemptSummary {
	attemptNumber: number;
	status: ExamAttemptStatus;
	startedAt: string;
	deadlineAt: string | null;
	submittedAt: string | null;
	/** Only meaningful when status === 'graded' (staff-finalized). */
	score: number | null;
	maxScore: number | null;
}

/**
 * Listing-level availability, derived honestly from current backend data.
 * - NOT_STARTED:      no attempts yet, window open
 * - IN_PROGRESS:      an in-progress attempt that has not passed its deadline
 * - TIME_EXPIRED:     in-progress attempt past its server deadline (the backend
 *                     closes and grades it the next time a start is requested)
 * - SUBMITTED:        at least one attempt submitted, results not yet released
 * - GRADED:           a staff-finalized attempt exists (results released)
 * - ATTEMPTS_USED:    reserved: attempt limit reached and nothing else to show
 * - NOT_OPEN_YET / CLOSED: outside opens_at/closes_at and no attempt to show
 */
export type ExamListState =
	| 'NOT_STARTED'
	| 'IN_PROGRESS'
	| 'TIME_EXPIRED'
	| 'SUBMITTED'
	| 'GRADED'
	| 'NOT_OPEN_YET'
	| 'CLOSED';

export interface ExamListItem {
	/** offering_assessments.id */
	id: string;
	assessmentId: string;
	offeringId: string;
	offeringName: string;
	courseTitle: string | null;
	title: string;
	/** assessments.type: quiz | exam | assignment | practice */
	kind: string;
	instructions: string | null;
	opensAt: string | null;
	closesAt: string | null;
	/** null = unlimited / no time limit */
	timeLimitSeconds: number | null;
	/** null = no limit configured in the database (legacy rows) */
	maxAttempts: number | null;
	/** null when the question query is incomplete. */
	questionCount: number | null;
	attempts: ExamAttemptSummary[];
	state: ExamListState;
}

export interface ExamListResult {
	items: ExamListItem[];
	/** True when a safety cap truncated the data; UI must say the list is partial. */
	truncated: boolean;
}

export const EXAM_LIST_LIMIT = 100;

/** Human text for a time limit. null means unlimited. */
export function formatTimeLimit(seconds: number | null): string {
	if (seconds === null) return 'No time limit';
	if (seconds < 60) return `${seconds} sec`;
	const minutes = Math.floor(seconds / 60);
	const rest = seconds % 60;
	if (minutes < 60) return rest ? `${minutes} min ${rest} sec` : `${minutes} min`;
	const hours = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m ? `${hours} h ${m} min` : `${hours} h`;
}

export function formatAttempts(max: number | null): string {
	if (max === null) return 'Attempt limit not configured';
	return `${max} attempt${max === 1 ? '' : 's'} allowed`;
}

/**
 * Derives the listing state. `now` is injectable for tests. The client clock is
 * used ONLY to choose a label here; the backend still enforces windows and
 * deadlines on every start/save/submit call.
 */
export function deriveExamListState(
	input: {
		opensAt: string | null;
		closesAt: string | null;
		attempts: Pick<ExamAttemptSummary, 'status' | 'deadlineAt'>[];
	},
	now: number
): ExamListState {
	const live = input.attempts.find((a) => a.status === 'in_progress');
	if (live) {
		return live.deadlineAt && Date.parse(live.deadlineAt) <= now ? 'TIME_EXPIRED' : 'IN_PROGRESS';
	}
	if (input.attempts.some((a) => a.status === 'graded')) return 'GRADED';
	if (input.attempts.some((a) => a.status === 'submitted')) return 'SUBMITTED';
	if (input.opensAt && Date.parse(input.opensAt) > now) return 'NOT_OPEN_YET';
	if (input.closesAt && Date.parse(input.closesAt) <= now) return 'CLOSED';
	return 'NOT_STARTED';
}
