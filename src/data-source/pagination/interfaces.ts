import { Any, List } from "@mantlebee/ts-core";

import { IDataSourceExtension } from "../interfaces";
import { PaginationExtensionEvents } from "./types";

/**
 * Extension that adds a {@link Paging} to the payload and keeps the total
 * count up to date. Pages are 1-based and always clamped to `[1, lastPage]`.
 * By default a change of the query built by the previous extensions (filters,
 * sorts, ...) between two reads brings the page back to 1
 * ({@link PaginationExtensionOptions.resetPageOnQueryChange}).
 * Every event is raised only when the value actually changes
 * (see {@link PaginationExtensionEvents}).
 * @typeParam TItem Type of the items.
 */
export interface IPaginationExtension<TItem = Any>
  extends IDataSourceExtension<TItem, PaginationExtensionEvents> {
  /** `true` when {@link page} is not the last one. */
  readonly canGoNextPage: boolean;
  /** `true` when {@link page} is not the first one. */
  readonly canGoPreviousPage: boolean;
  /** Size of a page, a positive integer. */
  readonly itemsPerPage: number;
  /** Allowed values of {@link itemsPerPage}, when restricted. */
  readonly itemsPerPageOptions?: List<number>;
  /** Number of pages, at least 1: `ceil(totalItemsCount / itemsPerPage)`. */
  readonly lastPage: number;
  /** Current page, from 1 to {@link lastPage}. */
  readonly page: number;
  /** Total count of the last read, `0` before the first. */
  readonly totalItemsCount: number;
  /** Goes to page 1. */
  goToFirstPage(): void;
  /** Goes to {@link lastPage}. */
  goToLastPage(): void;
  /** Goes to the next page, staying on the last one if already there. */
  goToNextPage(): void;
  /**
   * Goes to a page. Raises `page` only when the (clamped) target differs from
   * the current page.
   * @param page Target page, truncated to an integer and clamped to `[1, lastPage]`.
   */
  goToPage(page: number): void;
  /** Goes to the previous page, staying on the first one if already there. */
  goToPreviousPage(): void;
  /**
   * Changes the page size, then clamps the current page to the new
   * {@link lastPage} (raising `page` if it changes).
   * @param itemsPerPage Positive integer, one of {@link itemsPerPageOptions}
   * when they are set; otherwise an error is thrown.
   */
  setItemsPerPage(itemsPerPage: number): void;
}
