import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Sort } from "./types";

export function addSort<TItem = Any>(
  sort: Sort<TItem>,
  existingSorts: List<Sort<TItem>>,
  sortsLimit?: number,
): List<Sort<TItem>> {
  const sorts = removeSort(sort.field, existingSorts);
  if (!sortsLimit || sorts.length < sortsLimit) return sorts.concat(sort);
  return sorts;
}

export function removeSort<TItem = Any>(
  field: KeyOf<TItem>,
  existingSorts: List<Sort<TItem>>,
): List<Sort<TItem>> {
  return existingSorts.filter((a) => a.field !== field);
}
