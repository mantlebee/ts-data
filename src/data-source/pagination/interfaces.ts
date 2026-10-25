import { Any, List } from "@mantlebee/ts-core";

import { IDataSourceExtension } from "../interfaces";
import { PaginationExtensionEvents } from "./types";

/**
 * Extension that adds a {@link Paging} to the payload and keeps the total
 * count up to date. Pages are 1-based and always clamped to `[1, lastPage]`.
 * By default a change of the query built by the previous extensions (filters,
 * sorts, ...) between two reads brings the page back to 1
 * ({@link PaginationExtensionOptions.resetPageOnQueryChange}).
 */
export interface IPaginationExtension<TItem = Any>
  extends IDataSourceExtension<TItem, PaginationExtensionEvents> {
  /** `true` when {@link page} is not the last one. */
  readonly canGoNextPage: boolean;
  /** `true` when {@link page} is not the first one. */
  readonly canGoPreviousPage: boolean;
  readonly itemsPerPage: number;
  /** Allowed values of {@link itemsPerPage}, when restricted. */
  readonly itemsPerPageOptions?: List<number>;
  /** Number of pages, at least 1. */
  readonly lastPage: number;
  readonly page: number;
  readonly totalItemsCount: number;
  goToFirstPage(): void;
  goToLastPage(): void;
  goToNextPage(): void;
  /**
   * @param page Target page, clamped to `[1, lastPage]`.
   */
  goToPage(page: number): void;
  goToPreviousPage(): void;
  /**
   * @param itemsPerPage Positive integer, one of {@link itemsPerPageOptions}
   * when they are set; otherwise an error is thrown.
   */
  setItemsPerPage(itemsPerPage: number): void;
}
