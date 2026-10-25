import { Any, createHash, List, Nullable } from "@mantlebee/ts-core";

import { Paging } from "@/query-items";

import { DataSourceExtension } from "../models";
import { DataSourcePayload, DataSourceReader } from "../types";
import { IPaginationExtension } from "./interfaces";
import { PaginationExtensionEvents, PaginationExtensionOptions } from "./types";

/**
 * Reads the total count with its own reader on every read, then adds the
 * {@link Paging} to the payload. Place it after the extensions whose
 * contribution the count must consider (filters above all).
 * By default it goes back to the first page when the query built by the
 * previous extensions changes between two reads
 * ({@link PaginationExtensionOptions.resetPageOnQueryChange}).
 * @typeParam TItem Type of the items.
 */
export class PaginationExtension<TItem = Any>
  extends DataSourceExtension<TItem, PaginationExtensionEvents>
  implements IPaginationExtension<TItem>
{
  protected readonly _totalCountReader: DataSourceReader<TItem, number>;
  protected _itemsPerPage: number;
  protected readonly _itemsPerPageOptions?: List<number>;
  protected _page: number = 1;
  protected readonly _resetPageOnQueryChange:
    | boolean
    | List<keyof DataSourcePayload<TItem>>;
  protected _totalItemsCount: number = 0;
  /** Hash of the upstream query of the last read, `null` before the first. */
  private _queryHash: Nullable<string> = null;

  /**
   * @param totalCountReader Resolves the payload into the total count.
   * @param itemsPerPage Initial page size, a positive integer.
   * @param itemsPerPageOptions Allowed page sizes; `itemsPerPage` must be one of them.
   * @param options See {@link PaginationExtensionOptions}.
   */
  public constructor(
    totalCountReader: DataSourceReader<TItem, number>,
    itemsPerPage: number,
    itemsPerPageOptions?: List<number>,
    options?: PaginationExtensionOptions<TItem>,
  ) {
    super();
    this._itemsPerPageOptions = itemsPerPageOptions;
    this._validateItemsPerPage(itemsPerPage);
    this._itemsPerPage = itemsPerPage;
    this._resetPageOnQueryChange = options?.resetPageOnQueryChange ?? true;
    this._totalCountReader = totalCountReader;
  }

  public get canGoNextPage(): boolean {
    return this.page < this.lastPage;
  }
  public get canGoPreviousPage(): boolean {
    return this.page > 1;
  }
  public get itemsPerPage(): number {
    return this._itemsPerPage;
  }
  public get itemsPerPageOptions(): undefined | List<number> {
    return this._itemsPerPageOptions;
  }
  public get lastPage(): number {
    return Math.ceil(this.totalItemsCount / this.itemsPerPage) || 1;
  }
  public get page(): number {
    return this._page;
  }
  public get totalItemsCount(): number {
    return this._totalItemsCount;
  }

  public goToFirstPage(): void {
    this.goToPage(1);
  }
  public goToLastPage(): void {
    this.goToPage(this.lastPage);
  }
  public goToNextPage(): void {
    this.goToPage(this.page + 1);
  }
  public goToPage(page: number): void {
    const target = Math.min(Math.max(Math.trunc(page) || 1, 1), this.lastPage);
    if (target === this._page) return;
    this._page = target;
    this._eventBus.trigger("page", target);
  }
  public goToPreviousPage(): void {
    this.goToPage(this.page - 1);
  }
  public setItemsPerPage(itemsPerPage: number): void {
    this._validateItemsPerPage(itemsPerPage);
    if (itemsPerPage === this._itemsPerPage) return;
    this._itemsPerPage = itemsPerPage;
    this._eventBus.trigger("itemsPerPage", itemsPerPage);
    this.goToPage(this._page);
  }

  //#region Extension Methods
  protected get _paging(): Paging {
    return {
      itemsPerPage: this.itemsPerPage,
      page: this.page,
      totalItemsCount: this.totalItemsCount,
    };
  }
  public async getItemsBefore(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    this._resetPageIfQueryChanged(payload);
    const totalItemsCount = await this._totalCountReader(payload);
    if (totalItemsCount !== this._totalItemsCount) {
      this._totalItemsCount = totalItemsCount;
      this._eventBus.trigger("totalItemsCount", totalItemsCount);
      this.goToPage(this._page);
    }
    payload.paging = this._paging;
    return payload;
  }
  protected _triggerChange(): void {}
  //#endregion

  /**
   * Hash of the properties of the upstream payload that reset the page, in
   * a fixed order so the insertion order of the properties does not matter.
   * @returns `null` when the reset is disabled.
   */
  private _getQueryHash(payload: DataSourcePayload<TItem>): Nullable<string> {
    const option = this._resetPageOnQueryChange;
    if (option === false) return null;
    const keys: List<keyof DataSourcePayload<TItem>> =
      option === true
        ? (Object.keys(payload) as List<keyof DataSourcePayload<TItem>>).filter(
            (key) => key !== "paging",
          )
        : option.slice();
    keys.sort();
    return createHash(keys.map((key) => [key, payload[key]]));
  }
  /**
   * Goes back to the first page when the upstream query differs from the one
   * of the previous read. The first read never resets.
   */
  private _resetPageIfQueryChanged(payload: DataSourcePayload<TItem>): void {
    const queryHash = this._getQueryHash(payload);
    if (queryHash === null) return;
    if (this._queryHash !== null && queryHash !== this._queryHash)
      this.goToFirstPage();
    this._queryHash = queryHash;
  }
  private _validateItemsPerPage(itemsPerPage: number): void {
    if (!Number.isInteger(itemsPerPage) || itemsPerPage < 1)
      throw new Error(`itemsPerPage must be a positive integer, got ${itemsPerPage}`);
    const options = this._itemsPerPageOptions;
    if (options && !options.includes(itemsPerPage))
      throw new Error(
        `itemsPerPage must be one of [${options.join(", ")}], got ${itemsPerPage}`,
      );
  }
}
