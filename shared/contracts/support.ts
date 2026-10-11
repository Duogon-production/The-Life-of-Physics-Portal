import type { SupportAttachment, TicketStatus } from '@/shared/support';

export interface SupportTicketSummary {
	id: string;
	subject: string;
	status: TicketStatus;
	studentName: string;
	studentEmail: string;
	studentAvatarUrl: string | null;
	lastMessagePreview: string | null;
	messageCount: number;
	createdAt: string;
	lastMessageAt: string;
}

export interface SupportMessageView {
	id: string;
	senderName: string;
	senderAvatarUrl: string | null;
	senderRole: 'STUDENT' | 'ADMIN';
	/** True when the viewer sent this message. */
	isMine: boolean;
	body: string;
	attachments: SupportAttachment[];
	createdAt: string;
}

export interface SupportTicketDetail {
	ticket: SupportTicketSummary;
	messages: SupportMessageView[];
	viewerIsAdmin: boolean;
}

export interface SupportListPayload {
	viewerIsAdmin: boolean;
	tickets: SupportTicketSummary[];
}
