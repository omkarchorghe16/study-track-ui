import { Difficulty, ItemType } from './item.models';
import { LlmProvider } from './llm-settings.models';

export type ImportFileType = 'DOCX' | 'PDF' | 'MD' | 'TXT';
/** UPLOADED → PARSING → EXTRACTING → READY_FOR_REVIEW → COMPLETED; FAILED on error. */
export type ImportJobStatus = 'UPLOADED' | 'PARSING' | 'EXTRACTING' | 'READY_FOR_REVIEW' | 'COMPLETED' | 'FAILED';
/** PENDING and EDITED still wait for review. */
export type CandidateStatus = 'PENDING' | 'EDITED' | 'APPROVED' | 'REJECTED';

/** File extensions and size the API accepts for imports. */
export const IMPORT_EXTENSIONS: readonly string[] = ['.docx', '.pdf', '.md', '.markdown', '.txt'];
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

export const IMPORT_STATUS_LABELS: Record<ImportJobStatus, string> = {
  UPLOADED: 'Uploaded',
  PARSING: 'Reading the file',
  EXTRACTING: 'Extracting questions',
  READY_FOR_REVIEW: 'Ready for review',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export function isImportRunning(status: ImportJobStatus): boolean {
  return status === 'UPLOADED' || status === 'PARSING' || status === 'EXTRACTING';
}

export function isCandidateOpen(status: CandidateStatus): boolean {
  return status === 'PENDING' || status === 'EDITED';
}

/** `open` counts PENDING and EDITED candidates. */
export interface CandidateCounts {
  total: number;
  open: number;
  approved: number;
  rejected: number;
}

/** Response of the /api/v1/imports endpoints. */
export interface ImportJob {
  id: number;
  subjectId: number;
  fileName: string;
  fileType: ImportFileType;
  status: ImportJobStatus;
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

/** One question the LLM found. HTML is sanitised by the API. */
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
  /** An earlier open candidate of this import with the same question. */
  duplicateOfCandidateId?: number;
}

/** Body of PUT /imports/{id}/candidates/{cid}. targetTopicId wins over topicPath. */
export interface CandidateRequest {
  itemType: ItemType;
  title: string;
  questionHtml: string | null;
  answerHtml: string | null;
  notesHtml: string | null;
  difficulty: Difficulty | null;
  tags: string[];
  topicPath: string | null;
  targetTopicId: number | null;
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

export interface RejectResponse {
  rejectedCount: number;
  job: ImportJob;
}
