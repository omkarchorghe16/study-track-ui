import { Difficulty, ItemStatus, ItemType } from './item.models';

/** A piece of a result snippet; `match` marks the words to highlight. Plain text, never HTML. */
export interface SnippetPart {
  text: string;
  match: boolean;
}

export interface SearchResult {
  itemId: number;
  title: string;
  itemType: ItemType;
  difficulty: Difficulty;
  status: ItemStatus;
  subjectId: number;
  subjectName: string;
  topicId: number;
  topicName: string;
  snippet: SnippetPart[];
}

/** Response of GET /api/v1/items/search; `page` starts at 0. */
export interface SearchPage {
  query: string;
  items: SearchResult[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
