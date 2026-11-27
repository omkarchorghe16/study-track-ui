/** Response of GET and POST /api/v1/items/{id}/explanation: an AI-written explanation next to a question's answer. */
export interface ExplanationStep {
  title: string;
  detail: string;
}

/** `code` is empty when the topic needs no example. */
export interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation: string;
}

export interface RealWorldExample {
  title: string;
  scenario: string;
  howItApplies: string;
}

/** Plain text only (never HTML); fields that do not apply are empty strings or empty lists. */
export interface ExplanationContent {
  summary: string;
  analogy: string;
  keyPoints: string[];
  howItWorks: ExplanationStep[];
  example: CodeExample;
  realWorldExample: RealWorldExample;
  commonMistakes: string[];
  interviewTip: string;
}

export interface Explanation {
  questionId: number;
  content: ExplanationContent;
  provider: string;
  model: string;
  updatedAt: string;
}

export type ExplanationBatchState = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/** Progress of the background run that explains every question of a subject. */
export interface ExplanationBatch {
  state: ExplanationBatchState;
  total: number;
  completed: number;
  failed: number;
  /** Questions of the subject that still have no explanation. */
  missing: number;
  /** Why the run stopped, when FAILED. */
  message?: string;
}
