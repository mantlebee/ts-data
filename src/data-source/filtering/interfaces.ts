import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Filter, FilterLogics } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { FilterExtensionEvents } from "./types";

/**
 * Extension that adds a {@link FiltersExpression} to the payload.
 */
export interface IFilterExtension<TItem = Any>
  extends IDataSourceExtension<TItem, FilterExtensionEvents<TItem>> {
  readonly filters: List<Filter<TItem>>;
  /** `true` when at least one filter is set. */
  readonly hasFilters: boolean;
  /** Logic combining the filters. */
  readonly logic: FilterLogics;
  addFilter(filter: Filter<TItem>): void;
  clearFilters(): void;
  removeFilter(filter: Filter<TItem>): void;
  removeFiltersOf(field: KeyOf<TItem>): void;
  replaceFiltersOf(field: KeyOf<TItem>, ...filters: List<Filter<TItem>>): void;
  setFilters(filters: List<Filter<TItem>>): void;
  setLogic(logic: FilterLogics): void;
}
