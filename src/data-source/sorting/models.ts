import { KeyOf, List, Nullable } from "@mantlebee/ts-core";

import { addSort, removeSort, Sort } from "@/query-items";

import { DataSourceExtension } from "../models";
import { DataSourceExtensionOptions, DataSourcePayload } from "../types";
import { ISortExtension } from "./interfaces";
import { SortExtensionEvents } from "./types";

/**
 * Keeps the list of sorts, optionally limited in number, and always sends it
 * in the payload (an empty list means "no sort").
 * @typeParam TItem Type of the items.
 */
export class SortExtension<TItem>
  extends DataSourceExtension<TItem, SortExtensionEvents<TItem>>
  implements ISortExtension<TItem>
{
  protected _sorts: List<Sort<TItem>> = [];
  protected readonly _sortsLimit: Nullable<number>;

  /**
   * @param sortsLimit Maximum number of sorts; `null` means unlimited, `0`
   * means no sort can be added.
   * @param options Debounce of the `sortsChange` event.
   */
  public constructor(
    sortsLimit: Nullable<number> = null,
    options?: DataSourceExtensionOptions,
  ) {
    super(options);
    this._sortsLimit = sortsLimit;
  }

  public get hasSorts(): boolean {
    return this._sorts.length > 0;
  }
  public get sorts(): List<Sort<TItem>> {
    return this._sorts;
  }
  public get sortsLimit(): Nullable<number> {
    return this._sortsLimit;
  }

  public addSort(sort: Sort<TItem>): void {
    this._sorts = addSort(sort, this._sorts, this._sortsLimit);
    this._eventBus.trigger("addSort", sort, this.sorts);
    this._scheduleChange();
  }
  public clearSorts(): void {
    this._sorts = [];
    this._eventBus.trigger("clearSorts");
    this._scheduleChange();
  }
  public removeSort(field: KeyOf<TItem>): void {
    this._sorts = removeSort(field, this._sorts);
    this._eventBus.trigger("removeSort", field, this.sorts);
    this._scheduleChange();
  }
  public setSorts(sorts: List<Sort<TItem>>): void {
    this._sorts = sorts;
    this._eventBus.trigger("setSorts", this.sorts);
    this._scheduleChange();
  }

  //#region Extension Methods
  public async getItemsBefore(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.sorts = this.sorts;
    return payload;
  }
  protected _triggerChange(): void {
    this._eventBus.trigger("sortsChange", this.sorts, this.hasSorts);
  }
  //#endregion
}

/**
 * {@link SortExtension} holding one sort at most: {@link addSort} replaces
 * the current sort, whatever its field, raising a single `addSort` event.
 * @typeParam TItem Type of the items.
 */
export class SingleSortExtension<TItem> extends SortExtension<TItem> {
  /**
   * @param options Debounce of the `sortsChange` event.
   */
  public constructor(options?: DataSourceExtensionOptions) {
    super(1, options);
  }

  public addSort(sort: Sort<TItem>): void {
    this._sorts = [];
    super.addSort(sort);
  }
}
