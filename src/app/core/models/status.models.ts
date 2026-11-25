/** Response of GET /api/v1/status. */
export interface ApiStatus {
  service: string;
  apiVersion: string;
  currentUserId: number;
  displayName: string;
}
