import { Any, List } from "@mantlebee/ts-core";

import type { Pagination } from "../types";

/**
 * Cuts the page of a list, as a server would: `page` is 1-based, a page
 * lower than 1 is read as the first one, a page beyond the last one is
 * empty, not an error. `totalItemsCount` of the pagination is ignored: the
 * list is the whole result.
 * The list is never mutated; the result is always a new array.
 * @param items Items to page, already filtered and sorted.
 * @param pagination Page to cut; none for every item.
 * @returns the items of the page; a copy of the list without pagination.
 * @example
 * ```ts
 * const secondPage = pageItems(users, { itemsPerPage: 20, page: 2, totalItemsCount: 0 });
 * ```
 */
export function pageItems<TItem = Any>(
  items: List<TItem>,
  pagination?: Pagination,
): List<TItem> {
  if (!pagination) return items.slice();
  const page = Math.max(1, pagination.page);
  const start = (page - 1) * pagination.itemsPerPage;
  return items.slice(start, start + pagination.itemsPerPage);
}
