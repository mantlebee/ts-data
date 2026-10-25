import { Any, KeyOf, List } from "@mantlebee/ts-core";

import { Sort } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { SortExtensionEvents } from "./types";

/**
 * Extension that adds the list of {@link Sort} to the payload.
 */
export interface ISortExtension<TItem = Any>
  extends IDataSourceExtension<TItem, SortExtensionEvents<TItem>> {
  /** `true` when at least one sort is set. */
  readonly hasSorts: boolean;
  readonly sorts: List<Sort<TItem>>;
  /** Maximum number of sorts, `0` when unlimited. See {@link addSort}. */
  readonly sortsLimit: number;
  /**
   * @param sort Sort to add; replaces the sort on the same field, if any.
   * When the limit is reached and no sort is replaced, nothing changes but
   * the events are raised anyway with the unchanged sorts.
   */
  addSort(sort: Sort<TItem>): void;
  clearSorts(): void;
  removeSort(field: KeyOf<TItem>): void;
  setSorts(sorts: List<Sort<TItem>>): void;
}
