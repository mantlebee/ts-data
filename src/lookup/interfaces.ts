import { Any, List } from "@mantlebee/ts-core";

import type { LookupPage, LookupSearchResult, LookupValue } from "./types";

/**
 * A stateless source of **reference items**: the departments a combobox
 * searches by name, the department a cell of a grid shows from its id. Each
 * call has its own parameters, its own result and its own signal, nothing is
 * shared between calls, so one instance serves any number of consumers at
 * once (a combobox panel, the fifty cells of a grid page, another combobox on
 * the same entity), where a data source is a cursor with one query and one
 * `items`.
 *
 * An aborted call rejects with the `AbortedException` of ts-core, the same
 * rejection a superseded read of a data source has, so one `isAbortedException`
 * handles both.
 *
 * Build one with {@link createLookupSource} (over a reader) or
 * {@link createInMemoryLookupSource} (over a list), or write an object that
 * satisfies the interface for a service with its own endpoints. Decorate it
 * with {@link withBatching} and {@link withCache} where many consumers
 * resolve the same keys.
 * @typeParam TItem Type of the items.
 * @typeParam TValue Type of the key of an item, a primitive (see {@link LookupValue}).
 * @example
 * ```ts
 * const departments: ILookupSource<Department, number> = createLookupSource(readDepartments, {
 *   textField: "name",
 *   valueField: "id",
 * });
 * const { hasMore, items } = await departments.search("sal", { limit: 20, offset: 0 }, signal);
 * const [sales] = await departments.resolve([7]);
 * departments.valueOf(sales); // 7
 * ```
 */
export interface ILookupSource<TItem = Any, TValue = LookupValue> {
  /**
   * The items whose key is one of `values`, without the ones the source does
   * not know, in no particular order: index them with {@link valueOf}.
   * @param values Keys to resolve; an empty list resolves to `[]`.
   * @param signal Aborted by the caller when the result is no longer needed.
   * @returns the items found.
   */
  resolve(values: List<TValue>, signal?: AbortSignal): Promise<List<TItem>>;
  /**
   * The items whose text contains `query` (every item when `query` is empty),
   * one page at a time.
   * @param query Text to look for; `""` for every item.
   * @param page Page to return: `offset` of the first item, a multiple of
   * `limit`, and `limit` items.
   * @param signal Aborted by the caller when the result is no longer needed.
   * @returns the items of the page and whether more may follow.
   */
  search(
    query: string,
    page: LookupPage,
    signal?: AbortSignal,
  ): Promise<LookupSearchResult<TItem>>;
  /**
   * The key of an item: what {@link resolve} resolves by, and what a widget
   * emits as its value.
   * @param item Item to read the key of.
   */
  valueOf(item: TItem): TValue;
}
