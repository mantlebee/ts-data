import { Any } from "@mantlebee/ts-core";

import { IDataSourceExtension } from "../interfaces";
import { PaginationExtensionEvents } from "./types";

export interface IPaginationExtension<TItem = Any>
  extends IDataSourceExtension<TItem, PaginationExtensionEvents> {
  readonly itemsPerPage: number;
  readonly itemsPerPageOptions?: number[];
  readonly page: number;
  readonly totalItemsCount: number;
  goToFirstPage(): void;
  goToLastPage(): void;
  goToNextPage(): void;
  goToPage(page: number): void;
  goToPreviousPage(): void;
  setItemsPerPage(itemsPerPage: number): void;
}
