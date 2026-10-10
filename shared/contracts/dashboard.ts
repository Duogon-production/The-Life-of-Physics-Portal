export interface StudentLesson {
	href?: string;
	id: string;
	title: string;
	chapterNumber: number | null;
	chapters: {
		id: string;
		title: string;
		isCompleted: boolean;
	}[];
}

export interface SelfLearningLesson {
	id: string;
	title: string;
	chapterNumber: number | null;
	chapters: {
		id: string;
		title: string;
		isCompleted: boolean;
	}[];
}

export interface SelfLearningChapter {
	number: number;
	title: string;
	subtitle: string;
	description: string;
	lessonCount: number;
	lessons: SelfLearningLesson[];
}

export interface PeerMember {
	enrollmentStatus?: string;
	id: string;
	name: string;
	email: string;
	role: string;
	isCurrentUser: boolean;
	latestSubmission: {
		id: string;
		status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
		createdAt: string;
		chapterTitle: string;
		courseTitle?: string;
		timeAgo: string;
	} | null;
}

export interface GroupRosterViewProps {
	phase1?: boolean;
	groupName: string;
	nextSession: {
		date: string;
		dayLabel: string;
		timeLabel: string;
		fullFormatted: string;
	} | null;
	peers: PeerMember[];
}
