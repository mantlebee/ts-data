import { firstOrDefault, List, Nullable } from "@mantlebee/ts-core";

import { BrowseItemsPayload, Sort } from "@/browsing";

import { DataSourcePlugin } from "../../models";
import { IDataSourceSortPlugin } from "./interfaces";
import { removeSort, sortBy } from "./utils";

export class DataSourceSortPlugin<TItem> extends DataSourcePlugin<TItem>
  implements IDataSourceSortPlugin<TItem> {
  private _sorts: Nullable<List<Sort<TItem>>> = null;
  private _sortsNumberLimit: Nullable<number> = null;

  public constructor(sortsNumberLimit: Nullable<number> = null) {
    super();
    this._sortsNumberLimit = sortsNumberLimit;
  }

  public get sorts(): Nullable<List<Sort<TItem>>> {
    return this._sorts;
  }
  public get sortsNumberLimit(): Nullable<number> {
    return this._sortsNumberLimit;
  }

  public clearSorts(): void {
    this._sorts = [];
  }
  public removeSort(by: keyof TItem): void {
    if (this._sorts) this._sorts = removeSort(this._sorts, by);
  }
  public sortBy(by: keyof TItem, asc?: boolean): Nullable<Sort<TItem>> {
    if (this._sortsNumberLimit === null)
      this._sorts = sortBy(this._sorts, by, asc);
    else {
      const sorts = sortBy(this._sorts, by, asc);
      if (sorts.length <= this._sortsNumberLimit) this._sorts = sorts;
    }
    return firstOrDefault(this._sorts || [], (a) => a.by === by);
  }

  public beforeRead(
    payload: BrowseItemsPayload<TItem>
  ): Promise<BrowseItemsPayload<TItem>> {
    if (this.sorts && this.sorts.length) payload.sorts = this.sorts;
    return Promise.resolve(payload);
  }
}
