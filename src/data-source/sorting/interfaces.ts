import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Sort } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { SortExtensionEvents } from "./types";

/**
 * Extension that adds the list of {@link Sort} to the payload. Every mutation
 * raises its own event at once and schedules the debounced `sortsChange`
 * event (see {@link SortExtensionEvents}).
 * @typeParam TItem Type of the items.
 */
export interface ISortExtension<TItem = Any>
  extends IDataSourceExtension<TItem, SortExtensionEvents<TItem>> {
  /** `true` when at least one sort is set. */
  readonly hasSorts: boolean;
  /** Current sorts, by priority: the first one wins. */
  readonly sorts: List<Sort<TItem>>;
  /** Maximum number of sorts, `0` when unlimited. See {@link addSort}. */
  readonly sortsLimit: number;
  /**
   * Appends a sort, replacing the sort on the same field, if any (the
   * replacement goes to the end, i.e. to the lowest priority).
   * When the limit is reached and no sort is replaced, nothing changes but
   * the events are raised anyway with the unchanged sorts.
   * @param sort Sort to add.
   */
  addSort(sort: Sort<TItem>): void;
  /**
   * Removes every sort.
   */
  clearSorts(): void;
  /**
   * Removes the sort on a field, if any.
   * @param field Field no longer sorted.
   */
  removeSort(field: KeyOf<TItem>): void;
  /**
   * Replaces every sort.
   * @param sorts New sorts, taken as they are: neither the limit nor the
   * duplicated fields are checked.
   */
  setSorts(sorts: List<Sort<TItem>>): void;
}
