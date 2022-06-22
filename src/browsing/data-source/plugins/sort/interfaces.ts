import { List, Nullable } from "@mantlebee/ts-core";

import { Sort } from "@/browsing";

import { IDataSourcePlugin } from "../../interfaces";

export interface IDataSourceSortPlugin<TItem> extends IDataSourcePlugin<TItem> {
  readonly sorts: Nullable<List<Sort<TItem>>>;
  readonly sortsNumberLimit: Nullable<number>;
  clearSorts(): void;
  removeSort(by: keyof TItem): void;
  sortBy(by: keyof TItem, asc?: boolean): Nullable<Sort<TItem>>;
}
