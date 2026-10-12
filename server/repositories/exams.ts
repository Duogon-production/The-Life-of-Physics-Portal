import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/contracts/database.types';
import { examSummariesSchema } from '@/shared/contracts/exam-security';
import {
	EXAM_LIST_LIMIT,
	deriveExamListState,
	type ExamAttemptSummary,
	type ExamListItem,
	type ExamListResult,
} from '@/shared/contracts/exam-listing';

async function rows<T>(query: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
	const { data, error } = await query;
	if (error || data === null) throw new Error('Unable to load exams');
	return data;
}

// Stay below the Data API's 1,000-row response limit so cap+1 detects truncation.
const QUESTION_ROW_CAP = 500;

/**
 * Read-only exam listing. Every query runs with the caller's JWT, so Supabase
 * RLS stays the authority: students only receive published, enrolled schedules
 * and their OWN attempts; answer keys (is_correct) are never selected.
 *
 * Read-only summaries use the database release gate. No mutations live here.
 */
export function createExamsRepository(client: SupabaseClient<Database>, profileId: string) {
	return {
		/** `studentView` filters to published schedules; staff see drafts that RLS allows. */
		async list(options: { studentView: boolean; scheduleId?: string }): Promise<ExamListResult> {
			let scheduleQuery = client
				.from('offering_assessments')
				.select('id,offering_id,assessment_id,opens_at,closes_at,time_limit_seconds,max_attempts,published,assessments!inner(type)')
				.in('assessments.type', ['exam', 'quiz'])
				.order('id')
				.limit(EXAM_LIST_LIMIT + 1);
			if (options.studentView) scheduleQuery = scheduleQuery.eq('published', true);
			if (options.scheduleId) scheduleQuery = scheduleQuery.eq('id', options.scheduleId);
			const scheduleRows = await rows(scheduleQuery);
			let truncated = scheduleRows.length > EXAM_LIST_LIMIT;
			const schedules = scheduleRows.slice(0, EXAM_LIST_LIMIT);
			if (!schedules.length) return { items: [], truncated };

			const assessmentIds = Array.from(new Set(schedules.map((s) => s.assessment_id)));
			const offeringIds = Array.from(new Set(schedules.map((s) => s.offering_id)));
			const scheduleIds = schedules.map((s) => s.id);

			const [assessments, offerings, summaryPayload, questionRows] = await Promise.all([
				rows(client.from('assessments').select('id,course_id,title,type,instructions,status').in('id', assessmentIds).limit(EXAM_LIST_LIMIT + 1)),
				rows(client.from('course_offerings').select('id,course_id,name').in('id', offeringIds).limit(EXAM_LIST_LIMIT + 1)),
				rows(client.rpc('get_exam_summaries', { p_schedule_ids: scheduleIds })),
				// Only ids/counts: no answer-key columns exist on this table for students.
				rows(client.from('assessment_questions').select('assessment_id').in('assessment_id', assessmentIds).limit(QUESTION_ROW_CAP + 1)),
			]);
			const summaries = examSummariesSchema.parse(summaryPayload);
			if (schedules.some(s => !summaries.some(summary => summary.schedule_id === s.id))) {
				throw new Error('Unable to load exams');
			}
			if (questionRows.length > QUESTION_ROW_CAP || assessments.length > EXAM_LIST_LIMIT || offerings.length > EXAM_LIST_LIMIT) {
				truncated = true;
			}

			const courseIds = Array.from(new Set(offerings.map((o) => o.course_id)));
			const courses = courseIds.length
				? await rows(client.from('courses').select('id,title').in('id', courseIds).limit(EXAM_LIST_LIMIT + 1))
				: [];

			const questionCounts = new Map<string, number>();
			for (const q of questionRows) questionCounts.set(q.assessment_id, (questionCounts.get(q.assessment_id) ?? 0) + 1);

			const attemptsBySchedule = new Map<string, ExamAttemptSummary[]>();
			for (const summary of summaries) {
				const list: ExamAttemptSummary[] = [];
				for (const a of summary.attempts) {
					list.push({
						attemptNumber: a.attempt_number,
						status: a.status as ExamAttemptSummary['status'],
						startedAt: a.started_at,
						deadlineAt: a.deadline_at,
						submittedAt: a.submitted_at,
						resultReleased: a.result_released,
						// Defense in depth; database release authorization is authoritative.
						score: !a.result_released || a.score === null ? null : Number(a.score),
						maxScore: !a.result_released || a.max_score === null ? null : Number(a.max_score),
					});
				}
				attemptsBySchedule.set(summary.schedule_id, list);
			}

			const now = Date.now();
			const items: ExamListItem[] = [];
			for (const s of schedules) {
				const assessment = assessments.find((a) => a.id === s.assessment_id);
				const offering = offerings.find((o) => o.id === s.offering_id);
				if (!assessment || !offering) continue; // RLS hid a related row: do not fabricate it.
				if (!['exam', 'quiz'].includes(assessment.type)) continue;
				const attempts = attemptsBySchedule.get(s.id) ?? [];
				items.push({
					id: s.id,
					assessmentId: assessment.id,
					offeringId: offering.id,
					offeringName: offering.name,
					courseTitle: courses.find((c) => c.id === offering.course_id)?.title ?? null,
					title: assessment.title,
					kind: assessment.type,
					instructions: assessment.instructions,
					opensAt: s.opens_at,
					closesAt: s.closes_at,
					timeLimitSeconds: s.time_limit_seconds,
					maxAttempts: s.max_attempts,
					questionCount: questionRows.length > QUESTION_ROW_CAP ? null : questionCounts.get(assessment.id) ?? 0,
					attempts,
					state: deriveExamListState({ opensAt: s.opens_at, closesAt: s.closes_at, attempts }, now),
				});
			}
			items.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
			return { items, truncated };
		},

		/** Single exam by offering_assessment id; null when RLS hides it or it does not exist. */
		async get(scheduleId: string, options: { studentView: boolean }): Promise<ExamListItem | null> {
			const result = await this.list({ ...options, scheduleId });
			return result.items[0] ?? null;
		},
	};
}
