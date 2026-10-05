/** Persistence-level health checks (e.g. database connectivity). */
export interface IHealthRepository {
  /** Resolves if the database responds; rejects otherwise. */
  ping(): Promise<void>;
}
