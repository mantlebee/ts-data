import { List } from "@mantlebee/ts-core";

import { Paging } from "@/query-items";

import { DataSourceExtension } from "../models";
import { DataSourcePayload, DataSourceReader } from "../types";
import { IPaginationExtension } from "./interfaces";
import { PaginationExtensionEvents } from "./types";

/**
 * Reads the total count with its own reader on every read, then adds the
 * {@link Paging} to the payload. Place it after the extensions whose
 * contribution the count must consider (filters above all).
 * @typeParam TItem Type of the items.
 */
export class PaginationExtension<TItem>
  extends DataSourceExtension<TItem, PaginationExtensionEvents>
  implements IPaginationExtension<TItem>
{
  protected readonly _totalCountReader: DataSourceReader<TItem, number>;
  protected _itemsPerPage: number;
  protected readonly _itemsPerPageOptions?: List<number>;
  protected _page: number = 1;
  protected _totalItemsCount: number = 0;

  /**
   * @param totalCountReader Resolves the payload into the total count.
   * @param itemsPerPage Initial page size, a positive integer.
   * @param itemsPerPageOptions Allowed page sizes; `itemsPerPage` must be one of them.
   */
  public constructor(
    totalCountReader: DataSourceReader<TItem, number>,
    itemsPerPage: number,
    itemsPerPageOptions?: List<number>,
  ) {
    super();
    this._itemsPerPageOptions = itemsPerPageOptions;
    this._validateItemsPerPage(itemsPerPage);
    this._itemsPerPage = itemsPerPage;
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
