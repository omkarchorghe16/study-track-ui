import { Difficulty, ItemStatus, ItemType } from './item.models';
import { LlmProvider } from './llm-settings.models';

export type ImportFileType = 'DOCX' | 'PDF' | 'MD' | 'TXT' | 'CSV';
/**
 * UPLOADED → PARSING → EXTRACTING → COMPLETED (questions saved); FAILED on error, keeping the questions found before
 * it. READY_FOR_REVIEW only when some questions could not be saved (older imports).
 */
export type ImportJobStatus = 'UPLOADED' | 'PARSING' | 'EXTRACTING' | 'READY_FOR_REVIEW' | 'COMPLETED' | 'FAILED';
/** APPROVED: saved as a question. DUPLICATE: the subject already had it. PENDING/EDITED: not saved yet (older imports). */
export type CandidateStatus = 'PENDING' | 'EDITED' | 'APPROVED' | 'REJECTED' | 'DUPLICATE';

/** File extensions and size the API accepts for imports. */
export const IMPORT_EXTENSIONS: readonly string[] = ['.docx', '.pdf', '.md', '.markdown', '.txt', '.csv'];
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export const IMPORT_STATUS_LABELS: Record<ImportJobStatus, string> = {
  UPLOADED: 'Uploaded',
  PARSING: 'Reading the file',
  EXTRACTING: 'Extracting questions',
  READY_FOR_REVIEW: 'Some questions not saved',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export function isImportRunning(status: ImportJobStatus): boolean {
  return status === 'UPLOADED' || status === 'PARSING' || status === 'EXTRACTING';
}

export function isCandidateOpen(status: CandidateStatus): boolean {
  return status === 'PENDING' || status === 'EDITED';
}

/** `approved`: saved as questions; `duplicates`: already in the subject; `open`: not saved yet. */
export interface CandidateCounts {
  total: number;
  open: number;
  approved: number;
  rejected: number;
  duplicates: number;
}

/** Response of the /api/v1/imports endpoints. */
export interface ImportJob {
  id: number;
  subjectId: number;
  fileName: string;
  fileType: ImportFileType;
  status: ImportJobStatus;
  /** Missing for CSV imports, which are read without an LLM. */
  llmProvider?: LlmProvider;
  llmModel?: string;
  totalChunks: number;
  processedChunks: number;
  failedChunks: number;
  /** Processed chunks over total chunks, 0 while parsing. */
  percentComplete: number;
  inputTokens: number;
  outputTokens: number;
  /** Set when FAILED. */
  errorMessage?: string;
  candidates: CandidateCounts;
  createdAt: string;
  updatedAt: string;
}

/** One question an import found. HTML is sanitised by the API. */
export interface ImportCandidate {
  id: number;
  chunkIndex: number;
  status: CandidateStatus;
  itemType: ItemType;
  title: string;
  questionHtml?: string;
  answerHtml?: string;
  notesHtml?: string;
  difficulty?: Difficulty;
  tags: string[];
  imageIds: number[];
  /** The LLM's own 0-1 estimate. */
  confidence?: number;
  /** "Spring Boot > Security"; topics that do not exist are created on approval. */
  suggestedTopicPath?: string;
  targetTopicId?: number;
  createdItemId?: number;
  /** An existing item of the subject with the same question. */
  duplicateItemId?: number;
  /** An earlier candidate of this import with the same question. */
  duplicateOfCandidateId?: number;
  /** The user's status of the saved question (createdItemId); DONE when ticked as completed. */
  questionStatus?: ItemStatus;
}

/** The listed candidates, or every open one when `all` is true. */
export interface CandidateSelectionRequest {
  candidateIds?: number[];
  all?: boolean;
}

export interface ApproveResponse {
  approvedCount: number;
  createdTopicCount: number;
  createdItemIds: number[];
  job: ImportJob;
}
