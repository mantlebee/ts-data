import {
  ConstructorOf,
  EventsDefinition,
  ISubscribable,
  List,
  Nullable,
} from "@mantlebee/ts-core";

import type { IFilterExtension } from "./filtering/interfaces";
import type { IPaginationExtension } from "./pagination/interfaces";
import type { IProjectionExtension } from "./projection/interfaces";
import type { ISortExtension } from "./sorting/interfaces";
import type {
  DataSourceEvents,
  DataSourcePayload,
  DataSourceRetry,
} from "./types";

/**
 * {@link IDataSourceBase} exposing the four standard extensions by name.
 */
export interface IDataSource<TItem> extends IDataSourceBase<TItem> {
  readonly filtering?: IFilterExtension<TItem>;
  readonly paginating?: IPaginationExtension<TItem>;
  readonly projecting?: IProjectionExtension<TItem>;
  readonly sorting?: ISortExtension<TItem>;
}

/**
 * Reads items through a reader, letting its extensions shape the query and
 * the result. See {@link IDataSourceExtension} for the read cycle.
 */
export interface IDataSourceBase<TItem>
  extends ISubscribable<DataSourceEvents<TItem>> {
  /** `true` while a read is running. */
  readonly isReading: boolean;
  /** Items of the last successful read. */
  readonly items: List<TItem>;
  /**
   * Finds an extension by class. TypeScript cannot infer the item type of a
   * generic extension class from its constructor, so pass the type argument
   * to get the concrete type: `getExtension<FilterExtension<Item>>(FilterExtension)`;
   * without it the result is typed as {@link IDataSourceExtension}.
   * @param constructor Class of the extension to find.
   * @returns the first extension that is an instance of `constructor`, or `null`.
   */
  getExtension<TExtension extends IDataSourceExtension<TItem>>(
    constructor: ConstructorOf<TExtension>,
  ): Nullable<TExtension>;
  /**
   * Runs the read cycle and updates {@link items}. Rejects with the error of
   * the reader or of an extension, after raising the `error` event.
   */
  read(): Promise<void>;
}

/**
 * Hooks of the read cycle of an {@link IDataSourceBase}. Every hook is
 * optional and the extensions are invoked in array order:
 * 1. `getItemsBefore` of each extension builds the payload;
 * 2. the reader resolves the payload into the items; if it rejects,
 *    `onReadError` of each extension may recover by returning items
 *    (e.g. after a `retry`), otherwise the error propagates;
 * 3. `getItemsAfter` of each extension may transform the items.
 * An error thrown by a hook propagates as a read error.
 */
export interface IDataSourceExtension<
  TItem,
  TEvents extends EventsDefinition = EventsDefinition,
> extends ISubscribable<TEvents> {
  /**
   * Adds the contribution of the extension to the payload.
   * @param payload Payload built by the previous extensions.
   * @returns the payload for the next extension.
   */
  getItemsBefore?(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>>;
  /**
   * Transforms the items read.
   * @param items Items returned by the reader or by the previous extension.
   * @param payload Payload the items were read with.
   * @returns the items for the next extension.
   */
  getItemsAfter?(
    items: List<TItem>,
    payload: DataSourcePayload<TItem>,
  ): Promise<List<TItem>>;
  /**
   * Called when the reader rejects.
   * @param error Error thrown by the reader, or by a previous `retry`.
   * @param payload Payload the reader was called with.
   * @param retry Runs the reader again with the same payload.
   * @returns items to recover the read with; `undefined` to let the next
   * extension handle the error, or the error propagate.
   */
  onReadError?(
    error: unknown,
    payload: DataSourcePayload<TItem>,
    retry: DataSourceRetry<TItem>,
  ): Promise<List<TItem> | void>;
}
