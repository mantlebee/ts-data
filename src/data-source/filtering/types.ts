import { Any, EventsDefinition, KeyOf, List } from "@mantlebee/ts-core";

import { Filter, FilterLogics } from "@/query-items";

import { DataSourceExtensionOptions } from "../types";

/**
 * Events of a {@link FilterExtension}.
 */
export type FilterExtensionEvents<TItem = Any> = EventsDefinition & {
  /** [debounced] Any change of the filters: current filters, whether there is any. */
  filtersChange: [List<Filter<TItem>>, boolean];
  /** Added filter, current filters. */
  addFilter: [Filter<TItem>, List<Filter<TItem>>];
  clearFilters: [];
  /** Removed filter, current filters. */
  removeFilter: [Filter<TItem>, List<Filter<TItem>>];
  /** Cleared field, current filters. */
  removeFiltersOf: [KeyOf<TItem>, List<Filter<TItem>>];
  /** Replaced field, current filters. */
  replaceFiltersOf: [KeyOf<TItem>, List<Filter<TItem>>];
  /** Current filters. */
  setFilters: [List<Filter<TItem>>];
  /** Current logic. */
  setLogic: [FilterLogics];
};

/**
 * Options of a {@link FilterExtensionWithFixedFilters}.
 */
export type FilterExtensionWithFixedFiltersOptions =
  DataSourceExtensionOptions & {
    /**
     * Logic combining the fixed filters with the ones of the user.
     * Default {@link FilterLogics.and}.
     */
    groupsLogic?: FilterLogics;
  };
