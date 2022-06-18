import { IDataSourcePlugin } from "../../interfaces";

export interface IDataSourcePaginationPlugin<TItem>
  extends IDataSourcePlugin<TItem> {
  readonly canGoNextPage: boolean;
  readonly canGoPrevPage: boolean;
  readonly currentPage: number;
  readonly itemsPerPage: number;
  readonly lastPage: number;
  readonly nextPage: number;
  readonly pagesCount: number;
  readonly prevPage: number;
  readonly totalItemsCount: number;
  goFirstPage(): boolean;
  goLastPage(): boolean;
  goNextPage(): boolean;
  goPrevPage(): boolean;
  goToPage(page: number): void;
  setItemsPerPage(itemsPerPage: number): void;
}
