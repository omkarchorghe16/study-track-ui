import { Difficulty, ItemProgress, ItemStatus, ItemType } from './item.models';

/** Body of PATCH /api/v1/items/{id}/progress; missing fields stay unchanged, confidence 0 clears it. */
export interface ItemProgressUpdate {
  status?: ItemStatus;
  confidence?: number;
  bookmarked?: boolean;
}

export interface TopicCompletion {
  topicId: number;
  completed: boolean;
  completedAt?: string;
}

export type ReviewResult = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

export const REVIEW_RESULTS: readonly { value: ReviewResult; label: string }[] = [
  { value: 'AGAIN', label: 'Again' },
  { value: 'HARD', label: 'Hard' },
  { value: 'GOOD', label: 'Good' },
  { value: 'EASY', label: 'Easy' },
];

/**
 * Days until the next review if the card gets `result` now, mirroring the API's ReviewScheduler:
 * AGAIN 1, HARD 2, GOOD 3 x max(1, earlier reviews), EASY 6 x max(1, earlier reviews), at most 365.
 */
export function reviewIntervalDays(result: ReviewResult, earlierReviewCount: number): number {
  const multiplier = Math.max(1, earlierReviewCount);
  const days = { AGAIN: 1, HARD: 2, GOOD: 3 * multiplier, EASY: 6 * multiplier }[result];
  return Math.min(days, 365);
}

/** Response of POST /api/v1/reviews. */
export interface ReviewOutcome {
  itemId: number;
  result: ReviewResult;
  reviewedAt: string;
  intervalDays: number;
  progress: ItemProgress;
}

/** One flashcard of GET /api/v1/reviews/due. */
export interface DueItem {
  id: number;
  topicId: number;
  topicName: string;
  itemType: ItemType;
  title: string;
  questionHtml?: string;
  answerHtml?: string;
  notesHtml?: string;
  difficulty: Difficulty;
  status: ItemStatus;
  reviewCount: number;
  nextReviewAt?: string;
}

export interface DueItems {
  subjectId: number;
  /** Scheduled reviews due today or earlier. */
  dueCount: number;
  /** Items never reviewed (not DONE). */
  newCount: number;
  items: DueItem[];
}

/** Response of GET /api/v1/sessions/resume and PUT /api/v1/sessions. */
export interface ResumePoint {
  subjectId: number;
  subjectName: string;
  subjectIcon?: string;
  topicId?: number;
  topicName?: string;
  itemId?: number;
  itemTitle?: string;
  updatedAt: string;
}
