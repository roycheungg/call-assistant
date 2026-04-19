/**
 * Pagination helpers for list endpoints.
 *
 * Every list route should run untrusted `?limit` and `?offset` query params
 * through `parsePagination` so a client can't request an unbounded sweep
 * (e.g. `?limit=9999999`) and DOS the database.
 */

export interface Pagination {
  take: number;
  skip: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Parse `?limit=&offset=` from a URLSearchParams (or anything with a `.get`).
 * - `limit` clamps to [1, 100], defaults to 50
 * - `offset` clamps to >= 0, defaults to 0
 * - Non-numeric / NaN inputs fall back to defaults
 */
export function parsePagination(
  searchParams: URLSearchParams | { get(key: string): string | null }
): Pagination {
  const limitRaw = Number(searchParams.get("limit"));
  const offsetRaw = Number(searchParams.get("offset"));

  const take = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(Math.floor(limitRaw), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const skip = Number.isFinite(offsetRaw) && offsetRaw > 0
    ? Math.floor(offsetRaw)
    : 0;

  return { take, skip };
}

/**
 * Wrap a page of results with pagination metadata. Use this as the envelope
 * for list responses so the client can render "showing 1–50 of 327".
 */
export function paginated<T>(
  items: T[],
  total: number,
  pagination: Pagination
): { items: T[]; total: number; limit: number; offset: number } {
  return {
    items,
    total,
    limit: pagination.take,
    offset: pagination.skip,
  };
}
