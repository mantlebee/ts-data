import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { createInMemoryQueryItemsComparer } from "../../in-memory/comparer";
import type { InMemoryQueryItemsReaderOptions } from "../../in-memory/types";
import type { Sort } from "../types";

/**
 * Orders a list by its sorts, as a server would: by priority (the first
 * sort wins, the next ones break its ties), stable (items equal for every
 * sort keep their order), unset values first when ascending and last when
 * descending. The comparables of every sort are computed once per item,
 * through the comparer of the options (see {@link toComparableValue}), so
 * strings are ordered ignoring the case unless `options.caseSensitive`.
 * Values that are neither lower nor greater (mixed types, `NaN`) are equal.
 * The list and its items are never mutated; the result is always a new array.
 * @param items Items to order.
 * @param sorts Sorts to apply; none, or an empty list, keeps the order.
 * @param options Comparison options, see {@link InMemoryQueryItemsReaderOptions}.
 * @returns the ordered items; a copy of the list without sorts.
 * @example
 * ```ts
 * const byName = sortItems(users, [
 *   { asc: true, field: "lastName" },
 *   { asc: true, field: "firstName" },
 * ]);
 * ```
 */
export function sortItems<TItem = Any>(
  items: List<TItem>,
  sorts?: List<Sort<TItem>>,
  options?: InMemoryQueryItemsReaderOptions<TItem>,
): List<TItem> {
  if (!sorts || sorts.length === 0) return items.slice();
  const compare = createInMemoryQueryItemsComparer(options);
  const keyed = items.map((item, index) => ({
    index,
    item,
    keys: sorts.map((sort) =>
      compare(getFieldValue(item, sort.field), sort.field),
    ),
  }));
  keyed.sort((a, b) => {
    for (let i = 0; i < sorts.length; i++) {
      const result = compareValues(a.keys[i], b.keys[i]);
      if (result !== 0) return sorts[i].asc ? result : -result;
    }
    return a.index - b.index;
  });
  return keyed.map((a) => a.item);
}

//#region Internals
/**
 * Orders two comparables: unset values (`null`) first, then by `<` / `>`;
 * values that are neither lower nor greater (mixed types, `NaN`) are equal.
 */
function compareValues(a: Any, b: Any): number {
  if (a === b) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function getFieldValue<TItem>(item: TItem, field: KeyOf<TItem>): unknown {
  if (item === null || item === undefined) return undefined;
  return item[field];
}
//#endregion
