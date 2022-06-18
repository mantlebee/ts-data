import { List } from "@mantlebee/ts-core";

import { Sort } from "@/browsing";

export function removeSort<TItem>(
  sorts: List<Sort<TItem>>,
  by: keyof TItem
): List<Sort<TItem>> {
  return sorts.filter((a) => a.by !== by);
}

export function sortBy<TItem>(
  sorts: List<Sort<TItem>>,
  by: keyof TItem,
  asc?: boolean
): List<Sort<TItem>> {
  const sort = sorts.find((a) => a.by === by);
  if (sort) {
    if (asc !== undefined) sort.asc = asc;
    else if (sort.asc) sort.asc = false;
    else return removeSort(sorts, by);
  } else return [...sorts, { by, asc: asc !== undefined ? asc : true }];
  return [...sorts];
}
