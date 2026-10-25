import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Filter, FilterLogics } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { FilterExtensionEvents } from "./types";

/**
 * Extension that adds a {@link FiltersExpression} to the payload. Every
 * mutation raises its own event at once and schedules the debounced
 * `filtersChange` event (see {@link FilterExtensionEvents}).
 * @typeParam TItem Type of the items.
 */
export interface IFilterExtension<TItem = Any>
  extends IDataSourceExtension<TItem, FilterExtensionEvents<TItem>> {
  /** Current filters, in insertion order. */
  readonly filters: List<Filter<TItem>>;
  /** `true` when at least one filter is set. */
  readonly hasFilters: boolean;
  /** Logic combining the filters. */
  readonly logic: FilterLogics;
  /**
   * Appends a filter. Several filters on the same field are allowed (e.g. an
   * interval as two filters).
   * @param filter Filter to add.
   */
  addFilter(filter: Filter<TItem>): void;
  /**
   * Removes every filter.
   */
  clearFilters(): void;
  /**
   * Removes a filter, compared by reference.
   * @param filter The very object given to {@link addFilter} or {@link setFilters}.
   */
  removeFilter(filter: Filter<TItem>): void;
  /**
   * Removes every filter on a field.
   * @param field Field whose filters are removed.
   */
  removeFiltersOf(field: KeyOf<TItem>): void;
  /**
   * Removes every filter on a field and appends the given ones.
   * @param field Field whose filters are replaced.
   * @param filters New filters, appended as they are (their `field` is not
   * checked); none to just remove.
   */
  replaceFiltersOf(field: KeyOf<TItem>, ...filters: List<Filter<TItem>>): void;
  /**
   * Replaces every filter.
   * @param filters New filters.
   */
  setFilters(filters: List<Filter<TItem>>): void;
  /**
   * Changes the logic combining the filters. Raises `setLogic` only: it does
   * not schedule `filtersChange`.
   * @param logic New logic.
   */
  setLogic(logic: FilterLogics): void;
}
