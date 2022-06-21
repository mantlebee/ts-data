import { KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { IDataSourcePlugin } from "../../interfaces";

export interface IDataSourceSelectPlugin<TItem>
  extends IDataSourcePlugin<TItem> {
  readonly keys: Nullable<List<KeyOf<TItem>>>;
  select(keys: List<KeyOf<TItem>>): void;
  unselect(): void;
}
