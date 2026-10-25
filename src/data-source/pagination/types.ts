import { Any, EventsDefinition, List } from "@mantlebee/ts-core";

import type { DataSourcePayload } from "../types";

/**
 * Events of a {@link PaginationExtension}. Each one is raised only when the
 * value actually changes.
 */
export type PaginationExtensionEvents = EventsDefinition & {
  /** Current items per page. */
  itemsPerPage: [number];
  /** Current page. */
  page: [number];
  /** Current total count, updated by every read. */
  totalItemsCount: [number];
};

/**
 * Options of a {@link PaginationExtension}.
 * @typeParam TItem Type of the items.
 */
export type PaginationExtensionOptions<TItem = Any> = {
  /**
   * Goes back to the first page when the query built by the previous
   * extensions differs from the one of the previous read, so the page keeps
   * pointing at the items the user is browsing: a different set of filters
   * (or a different sort) makes "page 3" meaningless. Compared by hash, so a
   * filter removed and added back is not a change.
   * - `true` (default): every property of the payload except `paging`.
   * - `false`: never.
   * - a list of payload properties: only those, e.g. `["filters"]`.
   */
  resetPageOnQueryChange?: boolean | List<keyof DataSourcePayload<TItem>>;
};
