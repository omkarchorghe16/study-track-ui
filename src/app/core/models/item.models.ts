export type ItemType = 'QUESTION' | 'NOTE' | 'EXAMPLE' | 'DIAGRAM';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
/** The current user's study status for an item; items never touched are NOT_STARTED. */
export type ItemStatus = 'NOT_STARTED' | 'LEARNING' | 'DONE';

export const ITEM_STATUSES: readonly { value: ItemStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not started' },
  { value: 'LEARNING', label: 'Learning' },
  { value: 'DONE', label: 'Done' },
];

/** The current user's progress on one item (also the response of PATCH /items/{id}/progress). */
export interface ItemProgress {
  status: ItemStatus;
  /** 1 to 5, absent when not set. */
  confidence?: number;
  bookmarked: boolean;
  reviewCount: number;
  lastReviewedAt?: string;
  /** Absent until the first flashcard review. */
  nextReviewAt?: string;
}

export const ITEM_TYPES: readonly { value: ItemType; label: string }[] = [
  { value: 'QUESTION', label: 'Question' },
  { value: 'NOTE', label: 'Note' },
  { value: 'EXAMPLE', label: 'Example' },
  { value: 'DIAGRAM', label: 'Diagram' },
];

export const DIFFICULTIES: readonly { value: Difficulty; label: string }[] = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

/** Response of GET/POST/PUT /api/v1/items. */
export interface StudyItem {
  id: number;
  topicId: number;
  subjectId: number;
  itemType: ItemType;
  title: string;
  questionHtml?: string;
  answerHtml?: string;
  notesHtml?: string;
  difficulty: Difficulty;
  source: 'MANUAL' | 'IMPORT';
  tags: string[];
  sortOrder: number;
  previousItemId?: number;
  nextItemId?: number;
  progress: ItemProgress;
  createdAt: string;
  updatedAt: string;
}

export interface ItemSummary {
  id: number;
  topicId: number;
  itemType: ItemType;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  sortOrder: number;
  hasAnswer: boolean;
  status: ItemStatus;
  bookmarked: boolean;
  updatedAt: string;
}

export interface ItemPage {
  items: ItemSummary[];
  /** Starts at 0. */
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface ItemFilters {
  status?: ItemStatus | null;
  difficulty?: Difficulty | null;
  tag?: string | null;
  page?: number;
  size?: number;
}

/** Body of POST /items and PUT /items/{id}. */
export interface ItemRequest {
  topicId: number;
  itemType: ItemType;
  title: string;
  questionHtml: string | null;
  answerHtml: string | null;
  notesHtml: string | null;
  difficulty: Difficulty;
  tags: string[];
}

export function itemTypeLabel(type: ItemType): string {
  return ITEM_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function difficultyLabel(difficulty: Difficulty): string {
  return DIFFICULTIES.find((entry) => entry.value === difficulty)?.label ?? difficulty;
}

export function itemStatusLabel(status: ItemStatus): string {
  return ITEM_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}
