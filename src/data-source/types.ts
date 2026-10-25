import { Any, EventsDefinition, List } from "@mantlebee/ts-core";

import { QueryItemsPayload } from "@/query-items";

/**
 * Events of a {@link DataSource}.
 */
export type DataSourceEvents<TItem = Any> = EventsDefinition & {
  /** A read failed: the error, raised right before {@link DataSource.read} rethrows it. */
  error: [unknown];
  /** A read started (`true`) or ended (`false`), successfully or not. */
  isReading: [boolean];
  /** A read succeeded: the new items. */
  items: [List<TItem>];
};

/**
 * Options of a {@link DataSourceExtension}.
 */
export type DataSourceExtensionOptions = {
  /**
   * Milliseconds of quiet time before the debounced `*Change` event of the
   * extension is raised. Default {@link DataSourceExtensionChangeDelayDefault}.
   */
  changeDelay?: number;
};

/**
 * Query built by the extensions and given to the readers.
 */
export type DataSourcePayload<TItem = Any> = QueryItemsPayload<TItem>;

/**
 * Function that resolves a payload into a result: the items of the data
 * source, or anything else an extension needs (e.g. the total count).
 */
export type DataSourceReader<TItem = Any, TResult = List<TItem>> = (
  payload: DataSourcePayload<TItem>,
) => Promise<TResult>;
