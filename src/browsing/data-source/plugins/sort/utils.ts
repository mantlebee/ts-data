import { List, Nullable } from "@mantlebee/ts-core";

import { Sort } from "@/browsing";

function createSort<TItem>(by: keyof TItem, asc?: boolean): Sort<TItem> {
  return { by, asc: asc !== undefined ? asc : true };
}

export function removeSort<TItem>(
  sorts: List<Sort<TItem>>,
  by: keyof TItem
): List<Sort<TItem>> {
  return sorts.filter((a) => a.by !== by);
}

export function sortBy<TItem>(
  sorts: Nullable<List<Sort<TItem>>>,
  by: keyof TItem,
  asc?: boolean
): List<Sort<TItem>> {
  if (!sorts) {
    return [createSort(by, asc)];
  } else {
    const sort = sorts.find((a) => a.by === by);
    if (sort) {
      if (asc !== undefined) sort.asc = asc;
      else if (sort.asc) sort.asc = false;
      else return removeSort(sorts, by);
    } else return [...sorts, createSort(by, asc)];
    return [...sorts];
  }
}
