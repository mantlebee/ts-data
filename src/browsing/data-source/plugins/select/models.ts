import { Any, KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { BrowseItemsPayload, Select } from "@/browsing";

import { DataSourcePlugin } from "../../models";
import { IDataSourceSelectPlugin } from "./interfaces";
import { addSelect } from "./utils";

export class DataSourceSelectPlugin<TItem> extends DataSourcePlugin<TItem>
  implements IDataSourceSelectPlugin<TItem> {
  private _selects: Nullable<List<Select<TItem>>> = null;

  public get selects(): Nullable<List<Select<TItem>>> {
    return this._selects;
  }

  public clearSelects(): void {
    this._selects = null;
  }
  public select(key: KeyOf<TItem>, alias: string = key): Select<TItem> {
    const select = { alias, key };
    this._selects = addSelect(this._selects, select);
    return select;
  }
  public selectCustom(alias: string, defaultValue?: Any): Select<TItem> {
    const select = { alias, defaultValue };
    this._selects = addSelect(this._selects, select);
    return select;
  }

  public beforeRead(
    payload: BrowseItemsPayload<TItem>
  ): Promise<BrowseItemsPayload<TItem>> {
    const { selects } = this;
    if (selects) payload.selects = selects;
    return Promise.resolve(payload);
  }
}
