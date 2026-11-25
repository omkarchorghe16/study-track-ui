/** One subject in GET /api/v1/stats/overview. */
export interface SubjectProgress {
  id: number;
  name: string;
  icon?: string;
  archived: boolean;
  topicCount: number;
  completedTopicCount: number;
  itemCount: number;
  doneItemCount: number;
  learningItemCount: number;
  percentDone: number;
  /** Flashcards due today. */
  dueCount: number;
  /** Items never reviewed. */
  newCount: number;
}

export interface DailyReviewCount {
  /** yyyy-MM-dd in the API's time zone. */
  date: string;
  reviewCount: number;
}

/** Response of GET /api/v1/stats/overview. */
export interface StatsOverview {
  totalItems: number;
  doneItems: number;
  learningItems: number;
  notStartedItems: number;
  percentDone: number;
  totalTopics: number;
  completedTopics: number;
  dueToday: number;
  newItems: number;
  reviewsToday: number;
  currentStreakDays: number;
  longestStreakDays: number;
  subjects: SubjectProgress[];
  /** The last 30 days, oldest first. */
  reviewsPerDay: DailyReviewCount[];
}
