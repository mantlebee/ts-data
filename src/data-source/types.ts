import { Any, EventsDefinition, List } from "@mantlebee/ts-core";

import { QueryItemsPayload } from "@/query-items";

import type { IDataSourceExtension } from "./interfaces";
import type { IFilterExtension } from "./filtering/interfaces";
import type { IPaginationExtension } from "./pagination/interfaces";
import type { IProjectionExtension } from "./projection/interfaces";
import type { ISortExtension } from "./sorting/interfaces";

/**
 * Events of a {@link DataSourceBase}.
 */
export type DataSourceEvents<TItem = Any> = EventsDefinition & {
  /** A read failed: the error, raised right before {@link DataSourceBase.read} rethrows it. */
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
 * Options of a {@link DataSource}. The extensions run in this order to build
 * the payload: `filtering`, `sorting`, `projecting`, `paginating`, then
 * `extensions`. Filtering precedes pagination so the count reader of the
 * pagination receives the filters.
 */
export type DataSourceOptions<TItem = Any> = {
  /** Further extensions, run after the named ones, in array order. */
  extensions?: List<IDataSourceExtension<TItem>>;
  filtering?: IFilterExtension<TItem>;
  paginating?: IPaginationExtension<TItem>;
  projecting?: IProjectionExtension<TItem>;
  sorting?: ISortExtension<TItem>;
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

/**
 * Given to {@link IDataSourceExtension.onReadError}: runs the reader again
 * with the same payload.
 */
export type DataSourceRetry<TItem = Any> = () => Promise<List<TItem>>;
