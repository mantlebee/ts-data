import { BrowseItemsPayload } from "@/browsing";

import { DataSourcePlugin } from "../../models";
import { IDataSourceSkipTopPlugin } from "./interfaces";

export class DataSourceSkipTopPlugin<TItem> extends DataSourcePlugin<TItem>
  implements IDataSourceSkipTopPlugin<TItem> {
  private _skip: number = 0;
  private _top: number = 0;

  public get skip(): number {
    return this._skip;
  }
  public get top(): number {
    return this._top;
  }

  public setSkip(skip: number): void {
    this._skip = skip;
  }
  public setTop(top: number): void {
    this._top = top;
  }

  public beforeRead(
    payload: BrowseItemsPayload<TItem>
  ): Promise<BrowseItemsPayload<TItem>> {
    const { skip, top } = this;
    if (top) payload.top = top;
    if (skip) payload.skip = skip;
    return Promise.resolve(payload);
  }
}
