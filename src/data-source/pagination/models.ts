import { Any, Subscribable } from "@mantlebee/ts-core";

import { Paging } from "@/query-items";

import { DataSourcePayload, DataSourceReader } from "../types";
import { IPaginationExtension } from "./interfaces";
import { PaginationExtensionEvents } from "./types";

export class PaginationExtension<TItem = Any>
  extends Subscribable<PaginationExtensionEvents>
  implements IPaginationExtension<TItem>
{
  protected _totalCountReader: DataSourceReader<TItem, number>;
  protected _itemsPerPage: number;
  protected _itemsPerPageOptions?: number[];
  protected _page: number = 1;
  protected _totalItemsCount: number = 0;

  public constructor(
    totalCountReader: DataSourceReader<TItem, number>,
    itemsPerPage: number,
    itemsPerPageOptions?: number[],
  ) {
    super();
    this._totalCountReader = totalCountReader;
    this._itemsPerPage = itemsPerPage;
    this._itemsPerPageOptions = itemsPerPageOptions;
  }

  public get itemsPerPage(): number {
    return this._itemsPerPage;
  }
  public get itemsPerPageOptions(): undefined | number[] {
    return this._itemsPerPageOptions;
  }
  public get page(): number {
    return this._page;
  }
  public get totalItemsCount(): number {
    return this._totalItemsCount;
  }

  public goToFirstPage(): void {
    throw new Error("Method not implemented.");
  }
  public goToLastPage(): void {
    throw new Error("Method not implemented.");
  }
  public goToNextPage(): void {
    throw new Error("Method not implemented.");
  }
  public goToPage(page: number): void {
    this._page = page;
    this._eventBus.trigger("page", page);
  }
  public goToPreviousPage(): void {
    throw new Error("Method not implemented.");
  }
  public setItemsPerPage(itemsPerPage: number): void {
    this._itemsPerPage = itemsPerPage;
    this._eventBus.trigger("itemsPerPage", itemsPerPage);
  }

  //#region Extension Methods
  private get _paging(): Paging {
    return {
      itemsPerPage: this.itemsPerPage,
      page: this.page,
      totalItemsCount: this.totalItemsCount,
    };
  }
  public getCountBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.paging = this._paging;
    return Promise.resolve(payload);
  }
  public getItemsBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    return this._totalCountReader(payload).then((totalCount) => {
      this._totalItemsCount = totalCount;
      this._eventBus.trigger("totalItemsCount", totalCount);
      payload.paging = this._paging;
      return Promise.resolve(payload);
    });
  }
  //#endregion
}
