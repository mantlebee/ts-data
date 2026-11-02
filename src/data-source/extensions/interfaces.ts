import { Any, EventsDefinition, ISubscribable, List } from "@mantlebee/ts-core";

import type { IDataSource } from "../interfaces";
import type { DataSourcePayload } from "../types";
import type { DataSourceCapabilities, DataSourceCapability } from "./types";

/**
 * Hooks of the read cycle of an {@link IDataSource}. Every hook is optional
 * and the extensions are invoked in the order of the keys of the record they
 * are given with:
 * 1. `getItemsBefore` of each extension builds the payload;
 * 2. the reader resolves the payload into the items;
 * 3. `getItemsAfter` of each extension may transform the items.
 * An error thrown by the reader or by a hook propagates as a read error.
 * The order of the keys is up to the consumer and it matters: e.g. the
 * `filtering` key must precede the `pagination` one for the count reader to
 * receive the filters.
 *
 * Both hooks receive the `AbortSignal` of the read, aborted when a newer read
 * supersedes it: a hook that reads something hands it to its reader, the
 * others ignore it. Once the signal is aborted the data source stops the
 * cycle: the remaining hooks and the reader are not invoked. An implementer
 * declaring fewer parameters still type-checks.
 * @example
 * ```ts
 * class DistinctExtension<TItem>
 *   extends Subscribable<EventsDefinition>
 *   implements IDataSourceExtension<TItem>
 * {
 *   public async getItemsBefore(payload: DataSourcePayload<TItem>) {
 *     return { ...payload, distinct: true };
 *   }
 *   public async getItemsAfter(items: List<TItem>) {
 *     return Array.from(new Set(items));
 *   }
 * }
 * const users = createDataSource(readUsers, { filtering, distinct: new DistinctExtension<User>() });
 * ```
 */
export interface IDataSourceExtension<
  TItem = Any,
  TEvents extends EventsDefinition = EventsDefinition,
> extends ISubscribable<TEvents> {
  /**
   * Adds the contribution of the extension to the payload.
   * @param payload Payload built by the previous extensions.
   * @param signal Signal of the read, aborted when the read is superseded.
   * @returns the payload for the next extension.
   */
  getItemsBefore?(
    payload: DataSourcePayload<TItem>,
    signal?: AbortSignal,
  ): Promise<DataSourcePayload<TItem>>;
  /**
   * Transforms the items read.
   * @param items Items returned by the reader or by the previous extension.
   * @param payload Payload the items were read with.
   * @param signal Signal of the read, aborted when the read is superseded.
   * @returns the items for the next extension.
   */
  getItemsAfter?(
    items: List<TItem>,
    payload: DataSourcePayload<TItem>,
    signal?: AbortSignal,
  ): Promise<List<TItem>>;
}

/**
 * Shortcut for an {@link IDataSource} guaranteeing some extensions of the
 * package, named by key: `IDataSourceWith<User, "filtering" | "pagination">`
 * is `IDataSource<User, { filtering: IFilterExtension<User>; pagination:
 * IPaginationExtension<User> }>`, see {@link DataSourceCapabilities}. It is
 * the way a consumer states what it needs from a source in a signature; a
 * record is needed only to name a custom key or an optional one, and the two
 * compose by intersection.
 * @example
 * ```ts
 * function bindGrid(source: IDataSourceWith<User, "filtering" | "pagination">) {
 *   source.filtering.addFilter(adult);
 *   source.pagination.goToNextPage();
 * }
 * bindGrid(createDataSource(readUsers, { filtering, pagination, sorting })); // more than asked: fits
 * bindGrid(createDataSource(readUsers, { filtering })); // compile error: no `pagination`
 *
 * // A key of the package and a custom one.
 * type UsersSource = IDataSourceWith<User, "filtering"> &
 *   IDataSource<User, { distinct: DistinctExtension<User> }>;
 * ```
 * @typeParam TItem Type of the items.
 * @typeParam TCapability Keys of {@link DataSourceCapabilities} the source
 * guarantees.
 */
export type IDataSourceWith<
  TItem,
  TCapability extends DataSourceCapability,
> = IDataSource<TItem, Pick<DataSourceCapabilities<TItem>, TCapability>>;
