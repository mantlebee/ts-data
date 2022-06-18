import { List, Nullable } from "@mantlebee/ts-core";

import { Sort } from "@/browsing";

import { IDataSourcePlugin } from "../../interfaces";

export interface IDataSourceSortingPlugin<TItem>
  extends IDataSourcePlugin<TItem> {
  readonly sorts: List<Sort<TItem>>;
  readonly sortsNumberLimit: Nullable<number>;
  clearSorts(): void;
  removeSort(by: keyof TItem): void;
  sortBy(by: keyof TItem, asc?: boolean): void;
}
