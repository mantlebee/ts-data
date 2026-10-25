import { Any, EventsDefinition, KeyOf, List } from "@mantlebee/ts-core";

import { Filter, FilterLogics } from "@/query-items";

export type FilterExtensionEvents<TItem = Any> = EventsDefinition & {
  // Getters
  filtersChange: [List<Filter<TItem>>, boolean]; // [debounced] actual filters, has filters
  // Methods
  addFilter: [Filter<TItem>, List<Filter<TItem>>]; // added filter, actual filters
  clearFilters: [];
  removeFilter: [Filter<TItem>, List<Filter<TItem>>]; // removed filter, actual filters
  removeFiltersOf: [KeyOf<TItem>, List<Filter<TItem>>]; // cleared field, actual filters
  replaceFiltersOf: [KeyOf<TItem>, List<Filter<TItem>>]; // cleared field, actual filters
  setFilters: [List<Filter<TItem>>]; // actual filters
  setLogic: [FilterLogics]; // actual logic
};
