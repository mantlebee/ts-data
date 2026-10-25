import { EventsDefinition } from "@mantlebee/ts-core";

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
