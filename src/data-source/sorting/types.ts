import { Any, EventsDefinition, KeyOf, List } from "@mantlebee/ts-core";

import { Sort } from "@/query-items";

/**
 * Events of a {@link SortExtension}.
 * @typeParam TItem Type of the items.
 */
export type SortExtensionEvents<TItem = Any> = EventsDefinition & {
  /** [debounced] Any change of the sorts: current sorts, whether there is any. */
  sortsChange: [List<Sort<TItem>>, boolean];
  /** Added sort, current sorts (unchanged when the limit was reached). */
  addSort: [Sort<TItem>, List<Sort<TItem>>];
  clearSorts: [];
  /** Removed field, current sorts. */
  removeSort: [KeyOf<TItem>, List<Sort<TItem>>];
  /** Current sorts. */
  setSorts: [List<Sort<TItem>>];
};
