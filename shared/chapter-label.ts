/**
 * Chapter naming: "[Type] [Number] - [Name]", e.g. "Chapter 1 - Ohm's Law" or "Month 2 - Advanced Review".
 * Pure helpers shared by the server and the UI.
 */
export const DEFAULT_CHAPTER_TYPE = 'Chapter';
export const CHAPTER_TYPE_PRESETS = ['Chapter', 'Month', 'Unit', 'Week', 'Module', 'Term', 'Revision'] as const;
export const MAX_CHAPTER_TYPE_LENGTH = 24;
export const MAX_CHAPTER_NUMBER = 99;
export const MAX_CHAPTER_NAME_LENGTH = 120;
export const MAX_CHAPTER_SUMMARY_LENGTH = 200;
export const MAX_CHAPTER_DESCRIPTION_LENGTH = 2000;

/** Trims and collapses whitespace. Returns null when empty or too long. */
export const parseChapterType = (value: unknown): string | null => {
	if (typeof value !== 'string') return null;
	const cleaned = value.replace(/\s+/g, ' ').trim();
	if (!cleaned || cleaned.length > MAX_CHAPTER_TYPE_LENGTH) return null;
	return cleaned;
};

export const parseChapterNumber = (value: unknown): number | null => {
	const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
	if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > MAX_CHAPTER_NUMBER) return null;
	return n;
};

/** "Chapter 1" */
export const formatChapterLabel = (type: string | null | undefined, number: number | null | undefined) =>
	`${type?.trim() || DEFAULT_CHAPTER_TYPE} ${number ?? '—'}`;

/** "Chapter 1 - Ohm's Law", or just "Chapter 1" while no name exists. */
export const formatChapterTitle = (
	type: string | null | undefined,
	number: number | null | undefined,
	name?: string | null
) => (name?.trim() ? `${formatChapterLabel(type, number)} - ${name.trim()}` : formatChapterLabel(type, number));

/** Case-insensitive key so "month" and "Month" are the same group. */
export const chapterKey = (type: string | null | undefined, number: number | null | undefined) =>
	`${(type?.trim() || DEFAULT_CHAPTER_TYPE).toLowerCase()}:${number ?? 'none'}`;

export interface ChapterInfoInput {
	type: string;
	number: number;
	name: string;
	summary: string;
	description: string | null;
}

export function parseChapterInfo(
	body: unknown
): { ok: true; value: ChapterInfoInput } | { ok: false; error: string } {
	const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const type = parseChapterType(data.type);
	if (!type) return { ok: false, error: `Type is required (max ${MAX_CHAPTER_TYPE_LENGTH} characters).` };
	const number = parseChapterNumber(data.number);
	if (number === null) return { ok: false, error: `Number must be a whole number from 1 to ${MAX_CHAPTER_NUMBER}.` };
	const name = typeof data.name === 'string' ? data.name.trim() : '';
	if (!name || name.length > MAX_CHAPTER_NAME_LENGTH) {
		return { ok: false, error: `Name is required (max ${MAX_CHAPTER_NAME_LENGTH} characters).` };
	}
	const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
	if (summary.length > MAX_CHAPTER_SUMMARY_LENGTH) {
		return { ok: false, error: `Summary is too long (max ${MAX_CHAPTER_SUMMARY_LENGTH} characters).` };
	}
	const rawDescription = typeof data.description === 'string' ? data.description.trim() : '';
	if (rawDescription.length > MAX_CHAPTER_DESCRIPTION_LENGTH) {
		return { ok: false, error: `Description is too long (max ${MAX_CHAPTER_DESCRIPTION_LENGTH} characters).` };
	}
	return { ok: true, value: { type, number, name, summary, description: rawDescription || null } };
}
