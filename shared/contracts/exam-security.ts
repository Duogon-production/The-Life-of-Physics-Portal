import { z } from 'zod';

export const examStateSchema = z.object({
 schedule_id: z.string().uuid(), revision: z.number().int().nonnegative(),
 attempts_state: z.enum(['not_started','in_progress','retry_decision_pending','retry_accepted','finalized']),
 retry_decision: z.enum(['accepted','declined','not_eligible','window_closed']).nullable(),
 can_start: z.boolean(), can_decide: z.boolean(),
 current_attempt: z.object({id:z.string().uuid(),attempt_number:z.number().int().min(1).max(2),status:z.enum(['in_progress','submitted','graded','void']),deadline_at:z.string().nullable()}).nullable(),
 grading_state:z.enum(['pending','complete']),result_released:z.boolean(),review_released:z.boolean(),server_now:z.string(),
});
export type ExamSecurityState = z.infer<typeof examStateSchema>;
export const examContentSchema=z.array(z.object({id:z.string().uuid(),position:z.number().int().nonnegative(),question_type:z.string(),prompt:z.string(),points:z.number().nonnegative(),settings:z.record(z.unknown()),options:z.array(z.object({id:z.string().uuid(),text:z.string()})),response:z.record(z.unknown()).nullable(),media_asset_id:z.string().uuid().nullable()}));
export const examReviewSchema=z.object({schedule_id:z.string().uuid(),final_attempt_id:z.string().uuid(),questions:z.array(z.object({question_id:z.string().uuid(),correct_option_ids:z.array(z.string().uuid()),numeric_key:z.object({kind:z.literal('numeric'),value:z.number(),absolute_tolerance:z.number().nonnegative()}).nullable(),attempts:z.array(z.object({attempt_number:z.number().int().min(1).max(2),response:z.record(z.unknown()).nullable(),media_asset_id:z.string().uuid().nullable(),awarded_points:z.number().nonnegative().nullable(),feedback:z.string().nullable()}))}))});
export const examGradingSchema=z.object({state:examStateSchema,result:z.object({attempt_id:z.string().uuid(),score:z.number().nullable(),max_score:z.number().nullable(),status:z.string(),responses:z.array(z.object({id:z.string().uuid(),question_id:z.string().uuid(),awarded_points:z.number().nullable(),feedback:z.string().nullable(),graded_at:z.string().nullable()}))}),questions:z.array(z.object({question_id:z.string().uuid(),outcome:z.string(),awarded_points:z.number().nullable(),response_id:z.string().uuid().nullable(),response:z.record(z.unknown()).nullable(),media_asset_id:z.string().uuid().nullable()}))});
export const examSummariesSchema = z.array(z.object({
 schedule_id:z.string().uuid(),state:examStateSchema,
 attempts:z.array(z.object({
  attempt_number:z.number().int().min(1).max(2),status:z.enum(['in_progress','submitted','graded','void']),
  started_at:z.string(),deadline_at:z.string().nullable(),submitted_at:z.string().nullable(),
  result_released:z.boolean(),score:z.number().nonnegative().nullable(),max_score:z.number().nonnegative().nullable(),
 })),
}));
