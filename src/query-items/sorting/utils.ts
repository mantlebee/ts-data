import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Sort } from "./types";

/**
 * Adds a sort to a list, replacing any existing sort on the same field.
 * @param sort Sort to add.
 * @param existingSorts Current sorts, left untouched.
 * @param sortsLimit Maximum number of sorts; `0` (the default) means
 * unlimited. When the limit is reached the sort is not added, unless it
 * replaces one on the same field.
 * @returns the new list of sorts.
 */
export function addSort<TItem = Any>(
  sort: Sort<TItem>,
  existingSorts: List<Sort<TItem>>,
  sortsLimit = 0,
): List<Sort<TItem>> {
  const sorts = removeSort(sort.field, existingSorts);
  if (sortsLimit <= 0 || sorts.length < sortsLimit) return sorts.concat(sort);
  return sorts;
}

/**
 * Removes the sort on a field, if any.
 * @param field Field whose sort is removed.
 * @param existingSorts Current sorts, left untouched.
 * @returns the new list of sorts.
 */
export function removeSort<TItem = Any>(
  field: KeyOf<TItem>,
  existingSorts: List<Sort<TItem>>,
): List<Sort<TItem>> {
  return existingSorts.filter((a) => a.field !== field);
}
