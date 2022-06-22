import { Any, KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { Select } from "@/browsing";

import { IDataSourcePlugin } from "../../interfaces";

export interface IDataSourceSelectPlugin<TItem>
  extends IDataSourcePlugin<TItem> {
  readonly selects: Nullable<List<Select<TItem>>>;
  clearSelects(): void;
  select(key: KeyOf<TItem>, alias?: string, defaultValue?: Any): Select<TItem>;
  selectCustom(alias: string, value: Any): Select<TItem>;
}
