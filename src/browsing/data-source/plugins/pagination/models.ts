import { BrowseItemsPayload } from "@/browsing";

import { DataSourcePlugin } from "../../models";
import { IDataSourcePaginationPlugin } from "./interfaces";
import { TotalCountReadDelegate } from "./types";
import { calclulateLastPage, calclulateTop, calculateSkip } from "./utils";

export class DataSourcePaginationPlugin<TItem>
  extends DataSourcePlugin<TItem>
  implements IDataSourcePaginationPlugin<TItem> {
  private _currentPage = 1;
  private _itemsPerPage!: number;
  private _pagesCount = 0;
  private _readDelegate!: TotalCountReadDelegate<TItem>;
  private _totalItemsCount = 0;

  public constructor(
    itemsPerPage: number,
    readDelegate: TotalCountReadDelegate<TItem>
  ) {
    super();
    this._itemsPerPage = itemsPerPage;
    this._readDelegate = readDelegate;
  }

  public get canGoNextPage(): boolean {
    const lastPage = calclulateLastPage(
      this.totalItemsCount,
      this.itemsPerPage
    );
    return this.currentPage < lastPage;
  }
  public get canGoPrevPage(): boolean {
    return this.currentPage > 1;
  }
  public get currentPage(): number {
    return this._currentPage;
  }
  public get itemsPerPage(): number {
    return this._itemsPerPage;
  }
  public get lastPage(): number {
    return calclulateLastPage(this.totalItemsCount, this.itemsPerPage);
  }
  public get nextPage(): number {
    return this.canGoNextPage ? this.currentPage + 1 : this.currentPage;
  }
  public get pagesCount(): number {
    return this._pagesCount;
  }
  public get prevPage(): number {
    return this.canGoPrevPage ? this.currentPage - 1 : this.currentPage;
  }
  public get totalItemsCount(): number {
    return this._totalItemsCount;
  }

  beforeRead(
    payload: BrowseItemsPayload<TItem>
  ): Promise<BrowseItemsPayload<TItem>> {
    return this._readDelegate(payload).then((totalItemsCount) => {
      this._totalItemsCount = totalItemsCount;
      const { itemsPerPage, currentPage } = this;
      payload.skip = calculateSkip(itemsPerPage, currentPage);
      payload.top = calclulateTop(totalItemsCount, itemsPerPage, payload.skip);
      return payload;
    });
  }

  goFirstPage(): boolean {
    const goFirst = this.canGoPrevPage;
    if (goFirst) this._currentPage = 1;
    return goFirst;
  }
  goLastPage(): boolean {
    const goLast = this.canGoNextPage;
    if (goLast)
      this._currentPage = calclulateLastPage(
        this.totalItemsCount,
        this.itemsPerPage
      );
    return goLast;
  }
  goNextPage(): boolean {
    const goNext = this.canGoNextPage;
    if (goNext) this._currentPage++;
    return goNext;
  }
  goPrevPage(): boolean {
    const goPrev = this.canGoPrevPage;
    if (goPrev) this._currentPage--;
    return goPrev;
  }
  goToPage(page: number): void {
    this._currentPage = page;
  }
  setItemsPerPage(itemsPerPage: number): void {
    this._itemsPerPage = itemsPerPage;
  }
}
