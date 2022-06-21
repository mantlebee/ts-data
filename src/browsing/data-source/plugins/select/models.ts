import { KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { BrowseItemsPayload } from "@/browsing";

import { DataSourcePlugin } from "../../models";
import { IDataSourceSelectPlugin } from "./interfaces";

export class DataSourceSelectPlugin<TItem> extends DataSourcePlugin<TItem>
  implements IDataSourceSelectPlugin<TItem> {
  private _keys: Nullable<List<KeyOf<TItem>>> = null;

  public get keys(): Nullable<List<KeyOf<TItem>>> {
    return this._keys;
  }

  public select(keys: List<KeyOf<TItem>>): void {
    this._keys = keys;
  }
  public unselect(): void {
    this._keys = null;
  }

  public beforeRead(
    payload: BrowseItemsPayload<TItem>
  ): Promise<BrowseItemsPayload<TItem>> {
    const { keys } = this;
    if (keys) payload.select = keys;
    return Promise.resolve(payload);
  }
}
