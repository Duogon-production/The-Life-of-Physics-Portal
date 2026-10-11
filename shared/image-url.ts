/**
 * Site-wide image standard: images (course covers, logos, question/quiz images)
 * are referenced by external http(s) URL. Only student homework submissions are
 * uploaded as files.
 */
export const MAX_IMAGE_URL_LENGTH = 2048;

export function isValidImageUrl(value: unknown): value is string {
	if (typeof value !== 'string') return false;
	const trimmed = value.trim();
	if (!trimmed || trimmed.length > MAX_IMAGE_URL_LENGTH) return false;
	try {
		const url = new URL(trimmed);
		return url.protocol === 'https:' || url.protocol === 'http:';
	} catch {
		return false;
	}
}

/** Returns a trimmed valid URL, null for empty input, or undefined when invalid. */
export function normalizeOptionalImageUrl(value: unknown): string | null | undefined {
	if (value === null || value === undefined) return null;
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	if (!trimmed) return null;
	return isValidImageUrl(trimmed) ? trimmed : undefined;
}
