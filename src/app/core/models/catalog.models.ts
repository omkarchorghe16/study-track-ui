/** Response of the /api/v1/catalog endpoints: shared tracks, subjects and topics users can copy. */
export interface CatalogTrack {
  id: number;
  name: string;
  description?: string;
  subjectCount: number;
}

export interface CatalogSubject {
  id: number;
  trackId: number;
  name: string;
  description?: string;
  icon?: string;
  topicCount: number;
  /** Id of the user's own subject when it was already added, else missing. */
  copiedSubjectId?: number;
}

export interface CatalogTopicNode {
  id: number;
  name: string;
  children: CatalogTopicNode[];
}

/** Response of POST /api/v1/admin/catalog/import. */
export interface CatalogImportResult {
  rowsRead: number;
  tracksAdded: number;
  subjectsAdded: number;
  topicsAdded: number;
  rejectedRowCount: number;
  /** The first rejected rows as "Line n: reason". */
  rejectedRows: string[];
}
