/** Response of the /api/v1/subjects endpoints. */
export interface Subject {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  archived: boolean;
  topicCount: number;
  /** Topics the user marked complete. */
  completedTopicCount: number;
  itemCount: number;
  doneItemCount: number;
  learningItemCount: number;
  /** DONE items as a whole percent, rounded down (100 only when every item is done). */
  percentDone: number;
  createdAt: string;
  updatedAt: string;
}

/** Body of POST /subjects and PUT /subjects/{id}. A missing sortOrder keeps (or, on create, appends) the position. */
export interface SubjectRequest {
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder?: number | null;
  archived?: boolean;
}
