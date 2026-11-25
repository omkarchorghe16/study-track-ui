export type ItemType = 'QUESTION' | 'NOTE' | 'EXAMPLE' | 'DIAGRAM';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

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
