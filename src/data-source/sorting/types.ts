import { Any, EventsDefinition, KeyOf, List } from "@mantlebee/ts-core";

import { Sort } from "@/query-items";

export type SortExtensionEvents<TItem = Any> = EventsDefinition & {
  // Getters
  sortsChange: [List<Sort<TItem>>, boolean]; // [debounced] actual sorts, has sorts
  // Methods
  addSort: [Sort<TItem>, List<Sort<TItem>>]; // added sort, actual sorts
  clearSorts: [];
  removeSort: [KeyOf<TItem>, List<Sort<TItem>>]; // cleared field, actual sorts
  setSorts: [List<Sort<TItem>>]; // actual sorts
};
