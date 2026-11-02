import { Any, KeyOf, List } from "@mantlebee/ts-core";

import {
  createInMemoryQueryItemsReader,
  FilterLogics,
  FilterOperators,
  FiltersExpression,
  InMemoryQueryItemsReaderOptions,
  Pagination,
  QueryItemsReader,
} from "@/query-items";

import type { ILookupSource } from "./interfaces";
import { abortable } from "./internals";
import type { LookupPage, LookupReaderOptions } from "./types";

/**
 * A lookup source over a reader, the same `QueryItemsReader` a data source
 * reads through: `search` asks for `textField contains query` (no filter when
 * `query` is empty) with the `pagination` of the page, `resolve` asks for
 * `valueField in values` without pagination (and does not call the reader
 * for an empty list), `valueOf` reads `valueField`. The key type of the
 * source is the type of `valueField`.
 *
 * **Paging.** `Pagination` is 1-based and page-based, so a page is
 * `{ page: offset / limit + 1, itemsPerPage: limit, totalItemsCount: 0 }`
 * (the count is unknown): `offset` must be a multiple of `limit`, a panel
 * always pages by its own `limit`, and `search` rejects otherwise. `hasMore`
 * is `items.length >= limit`: no count reader, at the cost of one empty page
 * when the total is a multiple of `limit`. Asking for one item more than
 * `limit` would shift the next page, so it is not done.
 *
 * **Signal.** The signal is handed to the reader as it is (a `fetch` cancels
 * the request), and the call rejects with `AbortedException` as soon as the
 * signal is aborted, whatever the reader does with it: a reader ignoring the
 * signal, like the in-memory one, still behaves.
 * @typeParam TItem Type of the items, inferred from the reader.
 * @typeParam TValueField Field holding the key, inferred from the options.
 * @param reader Resolves a payload into the items.
 * @param options The fields of the text and of the key.
 * @returns a stateless source over the reader.
 * @example
 * ```ts
 * const departments = createLookupSource(
 *   (payload, signal) => api.getDepartments(payload, { signal }),
 *   { textField: "name", valueField: "id" },
 * ); // ILookupSource<Department, number>
 * ```
 */
export function createLookupSource<
  TItem,
  TValueField extends KeyOf<TItem> = KeyOf<TItem>,
>(
  reader: QueryItemsReader<TItem>,
  options: LookupReaderOptions<TItem, TValueField>,
): ILookupSource<TItem, TItem[TValueField]> {
  const { textField, valueField } = options;
  return {
    resolve: (values, signal) =>
      abortable(signal, async () => {
        if (!values.length) return [];
        const filters = filterOn<TItem>(valueField, FilterOperators.in, values);
        return reader({ filters }, signal);
      }),
    search: (query, page, signal) =>
      abortable(signal, async () => {
        const pagination = toPagination(page);
        const filters =
          query === ""
            ? undefined
            : filterOn<TItem>(textField, FilterOperators.contains, query);
        const items = await reader({ filters, pagination }, signal);
        return { hasMore: items.length >= page.limit, items };
      }),
    valueOf: (item) => item[valueField],
  };
}

/**
 * A lookup source over a list, through the in-memory reader of
 * `query-items`: the same semantics as {@link createLookupSource}, so a list
 * in a story or a spec behaves like a server. `search` compares the text the
 * way the in-memory filters do (case-insensitive unless `caseSensitive`).
 * @typeParam TItem Type of the items, inferred from the list.
 * @typeParam TValueField Field holding the key, inferred from the options.
 * @param items The list, or a function returning the current list, called on every call.
 * @param options The fields of the text and of the key, plus the comparison options of the in-memory reader.
 * @returns a stateless source over the list.
 * @example
 * ```ts
 * const departments = createInMemoryLookupSource(Departments, { textField: "name", valueField: "id" });
 * ```
 */
export function createInMemoryLookupSource<
  TItem,
  TValueField extends KeyOf<TItem> = KeyOf<TItem>,
>(
  items: List<TItem> | (() => List<TItem>),
  options: LookupReaderOptions<TItem, TValueField> &
    InMemoryQueryItemsReaderOptions<TItem>,
): ILookupSource<TItem, TItem[TValueField]> {
  const getItems = typeof items === "function" ? items : () => items;
  const { reader } = createInMemoryQueryItemsReader(getItems, options);
  return createLookupSource(reader, options);
}

//#region Internals
/** A single-filter expression: `field operator value`. */
function filterOn<TItem>(
  field: KeyOf<TItem>,
  operator: FilterOperators.contains | FilterOperators.in,
  value: Any,
): FiltersExpression<TItem> {
  return { filters: [{ field, operator, value }], logic: FilterLogics.and };
}

/**
 * The 1-based page of a payload from an offset-based page.
 * @throws when `limit` is not a positive integer or `offset` is not a
 * non-negative multiple of it.
 */
function toPagination(page: LookupPage): Pagination {
  const { limit, offset } = page;
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error(
      `The limit of a lookup page must be a positive integer, got ${limit}`,
    );
  if (!Number.isInteger(offset) || offset < 0 || offset % limit !== 0)
    throw new Error(
      `The offset of a lookup page must be a non-negative multiple of its limit (${limit}), got ${offset}`,
    );
  return { itemsPerPage: limit, page: offset / limit + 1, totalItemsCount: 0 };
}
//#endregion
