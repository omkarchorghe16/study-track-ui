/** Response of GET /api/v1/users/me. */
export interface CurrentUser {
  id: number;
  displayName: string;
  /** True when the user may change the shared catalog. */
  admin: boolean;
}
