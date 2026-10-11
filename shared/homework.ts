export const HOMEWORK_MODES = ['FILE_UPLOAD', 'PLATFORM_QUESTIONS'] as const;
export type HomeworkMode = (typeof HOMEWORK_MODES)[number];

export const isHomeworkMode = (value: unknown): value is HomeworkMode =>
	typeof value === 'string' && (HOMEWORK_MODES as readonly string[]).includes(value);

export const MAX_QUESTIONS_PER_SEGMENT = 100;
export const MAX_REVIEW_NOTE_LENGTH = 4000;
