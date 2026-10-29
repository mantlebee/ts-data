import { Any, List } from "@mantlebee/ts-core";

import type { FiltersExpression } from "./filtering";
import type { Paging } from "./pagination";
import type { Projection } from "./projection";
import type { Sort } from "./sorting";

/**
 * Description of a query over a list of items, agnostic of the storage that
 * runs it: every property is optional and is set only by who needs it (e.g.
 * the extensions of a `DataSource`). A reader translates it into the actual
 * request (SQL, OData, in-memory, ...).
 * @typeParam TItem Type of the items; the fields of filters, sorts and
 * projections are its keys.
 * @example
 * ```ts
 * const payload: QueryItemsPayload<User> = {
 *   filters: {
 *     filters: [{ field: "age", operator: FilterOperators.greaterThan, value: 18 }],
 *     logic: FilterLogics.and,
 *   },
 *   paging: { itemsPerPage: 20, page: 1, totalItemsCount: 0 },
 *   sorts: [{ asc: true, field: "lastName" }],
 * };
 * ```
 */
export type QueryItemsPayload<TItem = Any> = {
  /** `true` to drop the duplicated items of the result. */
  distinct?: boolean;
  /** Conditions the items must satisfy. */
  filters?: FiltersExpression<TItem>;
  /** Page requested. */
  paging?: Paging;
  /** Fields to return; absent or empty means every field. */
  projections?: List<Projection<TItem>>;
  /** Order of the items, by priority: the first sort wins. */
  sorts?: List<Sort<TItem>>;
};

/**
 * Function that resolves a {@link QueryItemsPayload} into a result: the
 * items matching it, or anything else derived from it (e.g. the total count
 * a pagination needs). A `DataSource` reads through one; the `in-memory`
 * folder ships readers over a plain array.
 *
 * The optional `signal` is aborted when the read the reader serves is
 * superseded by a newer one (or the data source is disposed): hand it to
 * `fetch` to cancel the request, or ignore it, the data source discards the
 * result of a superseded read anyway. Every reader written for the first
 * parameter only keeps working.
 * @typeParam TItem Type of the items.
 * @typeParam TResult Type of the result, the list of items by default.
 * @param payload Query to resolve.
 * @param signal Aborted when the result is no longer needed; `undefined`
 * when the caller has nothing to abort.
 * @example
 * ```ts
 * const reader: QueryItemsReader<User> = (payload, signal) =>
 *   fetch("/users", { body: JSON.stringify(payload), method: "POST", signal }).then((a) => a.json());
 * const countReader: QueryItemsReader<User, number> = (payload, signal) =>
 *   fetch("/users/count", { body: JSON.stringify(payload.filters), method: "POST", signal }).then((a) => a.json());
 * ```
 */
export type QueryItemsReader<TItem = Any, TResult = List<TItem>> = (
  payload: QueryItemsPayload<TItem>,
  signal?: AbortSignal,
) => Promise<TResult>;
