import { Any, KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { Sort } from "@/query-items";

import { IDataSourceExtension } from "../interfaces";
import { SortExtensionEvents } from "./types";

export interface ISortExtension<TItem = Any>
  extends IDataSourceExtension<TItem, SortExtensionEvents<TItem>> {
  readonly hasSorts: boolean;
  readonly sorts: List<Sort<TItem>>;
  readonly sortsLimit: Nullable<number>;
  addSort(sort: Sort<TItem>): void;
  clearSorts(): void;
  removeSort(field: KeyOf<TItem>): void;
  setSorts(sorts: List<Sort<TItem>>): void;
}
