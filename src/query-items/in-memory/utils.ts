import { Any, List } from "@mantlebee/ts-core";

import { filterItems } from "../filtering/in-memory";
import { pageItems } from "../pagination/in-memory";
import { distinctItems, projectItems } from "../projection/in-memory";
import { sortItems } from "../sorting/in-memory";
import type { QueryItemsPayload } from "../types";
import type {
  InMemoryQueryItemsReader,
  InMemoryQueryItemsReaderOptions,
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
 * @param options Comparison options, see {@link InMemoryQueryItemsReaderOptions}.
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
  options?: InMemoryQueryItemsReaderOptions<TItem>,
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
 * @param options Comparison options, see {@link InMemoryQueryItemsReaderOptions}.
 * @returns the number of matching items, the length of the list without filters.
 */
export function countItems<TItem = Any>(
  items: List<TItem>,
  payload: QueryItemsPayload<TItem>,
  options?: InMemoryQueryItemsReaderOptions<TItem>,
): number {
  const filtered = payload.filters
    ? filterItems(items, payload.filters, options)
    : items;
  if (!payload.distinct) return filtered.length;
  return project(filtered, payload).length;
}

/**
 * Creates the two readers of a `DataSource` over a list: `reader` runs
 * {@link queryItems}, `countReader` runs {@link countItems}. Both call
 * `getItems` when invoked, so the consumer can swap the data between two
 * reads, and both resolve on the next microtask, so `isReading` of the data
 * source is observable.
 * @param getItems Returns the current items, called on every read.
 * @param options Comparison options, see {@link InMemoryQueryItemsReaderOptions}.
 * @returns the readers, ready for the data source and its pagination.
 * @example
 * ```ts
 * const { countReader, reader } = createInMemoryQueryItemsReader(() => users);
 * const filtering = new FilterExtension<User>();
 * const sorting = new SortExtension<User>();
 * const paginating = new PaginationExtension<User>(countReader, 20);
 * const dataSource = new DataSource<User>(reader, [filtering, sorting, paginating]);
 * ```
 */
export function createInMemoryQueryItemsReader<TItem = Any>(
  getItems: () => List<TItem>,
  options?: InMemoryQueryItemsReaderOptions<TItem>,
): InMemoryQueryItemsReader<TItem> {
  return {
    countReader: async (payload) => countItems(getItems(), payload, options),
    reader: async (payload) => queryItems(getItems(), payload, options),
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
//#endregion
