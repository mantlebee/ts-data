import {
  Any,
  DebouncedDelegate,
  KeyOf,
  List,
  Nullable,
  Subscribable,
} from "@mantlebee/ts-core";

import { addSort, removeSort, Sort } from "@/query-items";

import { DataSourcePayload } from "../types";
import { ISortExtension } from "./interfaces";
import { SortExtensionEvents } from "./types";

export class SortExtension<TItem = Any>
  extends Subscribable<SortExtensionEvents<TItem>>
  implements ISortExtension<TItem>
{
  protected readonly _onSortsChange = new DebouncedDelegate(
    () => this._eventBus.trigger("sortsChange", this.sorts, this.hasSorts),
    100,
  );

  protected _sorts: List<Sort<TItem>> = [];
  protected _sortsLimit?: number;

  public constructor(sortsLimit?: number) {
    super();
    this._sortsLimit = sortsLimit;
  }

  public get hasSorts(): boolean {
    return this._sorts.length > 0;
  }
  public get sorts(): List<Sort<TItem>> {
    return this._sorts;
  }
  public get sortsLimit(): Nullable<number> {
    return this._sortsLimit || null;
  }

  public addSort(sort: Sort<TItem>): void {
    this._sorts = addSort(sort, this._sorts, this._sortsLimit);
    this._eventBus.trigger("addSort", sort, this.sorts);
    this._onSortsChange.call();
  }
  public clearSorts(): void {
    this._sorts = [];
    this._eventBus.trigger("clearSorts");
    this._onSortsChange.call();
  }
  public removeSort(field: KeyOf<TItem>): void {
    this._sorts = removeSort(field, this._sorts);
    this._eventBus.trigger("removeSort", field, this.sorts);
    this._onSortsChange.call();
  }
  public setSorts(sorts: List<Sort<TItem>>): void {
    this._sorts = sorts;
    this._eventBus.trigger("setSorts", this.sorts);
    this._onSortsChange.call();
  }

  //#region Extension Methods
  public getCountBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.sorts = this.sorts;
    return Promise.resolve(payload);
  }
  public getItemsBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.sorts = this.sorts;
    return Promise.resolve(payload);
  }
  //#endregion
}

export class MultiSortExtension<TItem = Any> extends SortExtension<TItem> {}

export class SingleSortExtension<TItem = Any> extends SortExtension<TItem> {
  public constructor() {
    super(1);
  }

  public addSort(sort: Sort<TItem>): void {
    this._sorts = [];
    super.addSort(sort);
  }
}
