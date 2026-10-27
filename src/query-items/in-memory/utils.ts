import { Any, List } from "@mantlebee/ts-core";

import { filterItems } from "../filtering/in-memory";
import { pageItems } from "../pagination/in-memory";
import { distinctItems, projectItems } from "../projection/in-memory";
import { sortItems } from "../sorting/in-memory";
import type { QueryItemsPayload } from "../types";
import type {
  InMemoryItems,
  InMemoryQueryOptions,
  InMemoryReader,
  InMemoryReaderOptions,
} from "./types";

/**
 * Resolves a payload against a list, as a server would, delegating each
 * step to the in-memory utils of the feature: {@link filterItems} with
 * `payload.filters`, {@link sortItems} with `payload.sorts`,
 * {@link projectItems} with `payload.projections`, {@link distinctItems}
 * when `payload.distinct`, then {@link pageItems} with `payload.paging`.
 * The list and its items are never mutated; the result is always a new array.
 * @param items Items to query.
 * @param payload Query to resolve; every property is optional.
 * @param options Comparison options, see {@link InMemoryQueryOptions}.
 * @returns the items of the requested page, every matching item when the
 * payload has no paging, a copy of the list when it has no property.
 * @example
 * ```ts
 * const page = queryItems(users, {
 *   filters: { filters: [{ field: "age", operator: FilterOperators.greaterThanOrEqual, value: 18 }], logic: FilterLogics.and },
 *   paging: { itemsPerPage: 20, page: 2, totalItemsCount: 0 },
 *   sorts: [{ asc: true, field: "lastName" }],
 * });
 * ```
 */
export function queryItems<TItem = Any>(
  items: List<TItem>,
  payload: QueryItemsPayload<TItem>,
  options?: InMemoryQueryOptions<TItem>,
): List<TItem> {
  const filtered = filterItems(items, payload.filters, options);
  const sorted = sortItems(filtered, payload.sorts, options);
  const projected = project(sorted, payload);
  return pageItems(projected, payload.paging);
}

/**
 * Counts the items of a list matching a payload, ignoring its sorts and
 * paging: the total count reader of the `PaginationExtension`, so the count
 * agrees with the pages of {@link queryItems}. With `payload.distinct` the
 * duplicates, found on `payload.projections` when given, are not counted.
 * @param items Items to count.
 * @param payload Query whose `filters`, `projections` and `distinct` are applied.
 * @param options Comparison options, see {@link InMemoryQueryOptions}.
 * @returns the number of matching items, the length of the list without filters.
 */
export function countItems<TItem = Any>(
  items: List<TItem>,
  payload: QueryItemsPayload<TItem>,
  options?: InMemoryQueryOptions<TItem>,
): number {
  const filtered = payload.filters
    ? filterItems(items, payload.filters, options)
    : items;
  if (!payload.distinct) return filtered.length;
  return project(filtered, payload).length;
}

/**
 * Creates the two readers of a `DataSource` over a list: `reader` runs
 * {@link queryItems}, `countReader` runs {@link countItems}. Both read the
 * list when invoked, so a getter lets the consumer swap the data between two
 * reads, and both resolve asynchronously (next microtask, or after
 * {@link InMemoryReaderOptions.delay} milliseconds).
 * @param items Items to serve, or a getter returning the current items.
 * @param options Comparison options and latency, see {@link InMemoryReaderOptions}.
 * @returns the readers, ready for the data source and its pagination.
 * @example
 * ```ts
 * const { countReader, reader } = createInMemoryReader(users);
 * const filtering = new FilterExtension<User>();
 * const sorting = new SortExtension<User>();
 * const paginating = new PaginationExtension<User>(countReader, 20);
 * const dataSource = new DataSource<User>(reader, [filtering, sorting, paginating]);
 * ```
 */
export function createInMemoryReader<TItem = Any>(
  items: InMemoryItems<TItem>,
  options?: InMemoryReaderOptions<TItem>,
): InMemoryReader<TItem> {
  const getItems = typeof items === "function" ? items : () => items;
  const delay = options?.delay;
  return {
    countReader: async (payload) => {
      await wait(delay);
      return countItems(getItems(), payload, options);
    },
    reader: async (payload) => {
      await wait(delay);
      return queryItems(getItems(), payload, options);
    },
  };
}

//#region Internals
/** Applies `projections`, then `distinct`, of a payload. */
function project<TItem>(
  items: List<TItem>,
  payload: QueryItemsPayload<TItem>,
): List<TItem> {
  const projected = payload.projections
    ? projectItems(items, payload.projections)
    : items;
  return payload.distinct ? distinctItems(projected) : projected;
}

/** Resolves after `delay` milliseconds, or on the next microtask. */
function wait(delay?: number): Promise<void> {
  if (delay && delay > 0)
    return new Promise((resolve) => setTimeout(resolve, delay));
  return Promise.resolve();
}
//#endregion
