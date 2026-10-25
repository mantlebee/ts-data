import { EventsDefinition } from "@mantlebee/ts-core";

export type PaginationExtensionEvents = EventsDefinition & {
  // Getters
  itemsPerPage: [number];
  page: [number];
  totalItemsCount: [number];
};
