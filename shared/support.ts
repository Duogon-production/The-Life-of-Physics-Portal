export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const isTicketStatus = (value: unknown): value is TicketStatus =>
	typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value);

export const STATUS_LABEL: Record<TicketStatus, string> = {
	OPEN: 'Open',
	IN_PROGRESS: 'In Progress',
	RESOLVED: 'Resolved',
};

export const OTHER_SUBJECT = 'Other';
export const SUBJECT_PRESETS = [
	"I can't log in",
	'My account is waiting for approval',
	"A video won't play",
	'Homework upload problem',
	'Exam problem',
	'Page is slow or not loading',
	OTHER_SUBJECT,
] as const;

export const MAX_SUBJECT_LENGTH = 120;
export const MAX_SUPPORT_MESSAGE_LENGTH = 2000;
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

export interface SupportAttachment {
	url: string;
	name: string;
	size: number;
	type: string;
}

/**
 * Subject comes from the preset list. "Other" requires the custom text; any
 * other preset ignores custom text so the subject is always predictable.
 */
export function parseSubject(
	body: unknown
): { ok: true; subject: string } | { ok: false; error: string } {
	const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const preset = typeof data.subject === 'string' ? data.subject.trim() : '';
	if (!(SUBJECT_PRESETS as readonly string[]).includes(preset)) {
		return { ok: false, error: 'Choose a subject from the list.' };
	}
	if (preset !== OTHER_SUBJECT) return { ok: true, subject: preset };
	const custom = typeof data.customSubject === 'string' ? data.customSubject.trim() : '';
	if (!custom) return { ok: false, error: 'Please specify your subject.' };
	return { ok: true, subject: custom.slice(0, MAX_SUBJECT_LENGTH) };
}

const isUploadHost = (hostname: string) =>
	hostname === 'utfs.io' ||
	hostname.endsWith('.utfs.io') ||
	hostname.endsWith('.ufs.sh') ||
	hostname === 'uploadthing.com' ||
	hostname.endsWith('.uploadthing.com');

/** Attachments must be UploadThing files, so tickets can't embed arbitrary external links or trackers. */
export function parseAttachments(raw: unknown): SupportAttachment[] | null {
	if (raw === undefined || raw === null) return [];
	if (!Array.isArray(raw) || raw.length > MAX_ATTACHMENTS_PER_MESSAGE) return null;
	const out: SupportAttachment[] = [];
	for (const item of raw) {
		if (!item || typeof item !== 'object') return null;
		const v = item as Record<string, unknown>;
		if (typeof v.url !== 'string') return null;
		try {
			const url = new URL(v.url);
			if (url.protocol !== 'https:' || !isUploadHost(url.hostname)) return null;
		} catch {
			return null;
		}
		out.push({
			url: v.url,
			name: typeof v.name === 'string' && v.name.trim() ? v.name.trim().slice(0, 200) : 'attachment',
			size: typeof v.size === 'number' && Number.isFinite(v.size) && v.size >= 0 ? Math.floor(v.size) : 0,
			type: typeof v.type === 'string' ? v.type.slice(0, 100) : '',
		});
	}
	return out;
}

export function parseMessage(
	body: unknown
): { ok: true; text: string; attachments: SupportAttachment[] } | { ok: false; error: string } {
	const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
	const text = typeof data.body === 'string' ? data.body.trim().slice(0, MAX_SUPPORT_MESSAGE_LENGTH) : '';
	const attachments = parseAttachments(data.attachments);
	if (attachments === null) return { ok: false, error: 'One of the attachments is not valid.' };
	if (!text && attachments.length === 0) return { ok: false, error: 'Write a message or attach a file.' };
	return { ok: true, text, attachments };
}

export const isImageAttachment = (a: Pick<SupportAttachment, 'type' | 'name'>) =>
	a.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/i.test(a.name);
