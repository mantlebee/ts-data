import { Any, EventsDefinition, List } from "@mantlebee/ts-core";

import { QueryItemsPayload, QueryItemsReader } from "@/query-items";

/**
 * Events of a {@link DataSource}.
 */
export type DataSourceEvents<TItem = Any> = EventsDefinition & {
  /**
   * A read failed: the error, raised right before {@link DataSource.read}
   * rethrows it. Never raised for a superseded read.
   */
  error: [unknown];
  /**
   * The first read of a burst started (`true`) or the latest one settled
   * (`false`), successfully or not: a read superseded by a newer one raises
   * nothing.
   */
  isReading: [boolean];
  /** The latest read succeeded: the new items. */
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
 * source, or anything else an extension needs (e.g. the total count). The
 * same as `QueryItemsReader`, named from the data source's point of view:
 * the optional `signal` is aborted when the read is superseded by a newer
 * one, so a reader can hand it to `fetch`.
 * @example
 * ```ts
 * const readUsers: DataSourceReader<User> = (payload, signal) =>
 *   fetch("/users", { body: JSON.stringify(payload), method: "POST", signal }).then((a) => a.json());
 * ```
 */
export type DataSourceReader<
  TItem = Any,
  TResult = List<TItem>,
> = QueryItemsReader<TItem, TResult>;
