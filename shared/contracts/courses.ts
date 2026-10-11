/** Data contracts used by the UI. No database or server imports. */

export interface Course {
	id: string;
	userId: string;
	title: string;
	isPublished: boolean;
	description: string | null;
	imageUrl: string | null;
	categoryId: string | null;
	chapterNumber: number | null;
	chapterType?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface Category {
	id: string;
	name: string;
}

export interface Attachment {
	id: string;
	name: string;
	url: string;
	fileKey: string | null;
	fileSize: number | null;
	courseId: string;
	chapterId: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface Chapter {
	id: string;
	title: string;
	position: number;
	isPublished: boolean;
	courseId: string;
	description: string | null;
	videoUrl: string | null;
	solutionVideoUrl: string | null;
	isFree: boolean;
	contentType: string | null;
	homeworkMode?: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface HomeworkQuestion {
	id: string;
	chapterId: string;
	position: number;
	text: string;
	imageUrl: string | null;
	/** Only sent to students after they submit their homework. */
	answer?: string | null;
	answerImageUrl?: string | null;
}

export interface MuxData {
	id: string;
	assetId: string;
	chapterId: string;
	playbackId: string | null;
}

export interface UserProgress {
	id: string;
	userId: string;
	chapterId: string;
	isCompleted: boolean;
	isWatched: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface Feedback {
	id: string;
	userId: string;
	courseId: string;
	content: string;
	fullName: string;
	avatarUrl: string;
}

export type CourseWithProgressWithCategory = Course & {
	category: Category | null;
	chapters: { id: string }[];
	progress: number | null;
};

export type TeacherCourse = Course & { chapters: Chapter[] };

export type TeacherChapter = Chapter & {
	muxData: MuxData | null;
	attachments: Attachment[];
	homeworkQuestions?: HomeworkQuestion[];
};

export type CourseEntry = Course & {
	chapters: Chapter[];
	category: Category | null;
};

export type DashboardCourse = Course & {
	category: Category | null;
	chapters: (Chapter & { userProgresses: UserProgress[] })[];
	progress: number | null;
};

export interface DashboardCourses {
	completedCourses: DashboardCourse[];
	coursesInProgress: DashboardCourse[];
}

export interface RecommendCourse {
	id: string;
	courseId: string;
	categoryId: string;
	views: number;
	createdAt: Date;
	updatedAt: Date;
	course: Course;
}

/** JSON responses encode dates as strings; server component props retain Dates. */
export type JsonResponse<T> = T extends Date ? string
	: T extends (infer Item)[] ? JsonResponse<Item>[]
	: T extends object ? { [Key in keyof T]: JsonResponse<T[Key]> }
	: T;
