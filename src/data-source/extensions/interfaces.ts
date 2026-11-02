import { Any, EventsDefinition, ISubscribable, List } from "@mantlebee/ts-core";

import type { IDataSource } from "../interfaces";
import type { DataSourcePayload } from "../types";
import type {
  DataSourceCapabilities,
  DataSourceCapability,
  DataSourceReadNext,
} from "./types";

/**
 * Hooks of the read cycle of an {@link IDataSource}, both optional. The cycle
 * has two phases, each one over every extension in the order of the keys of
 * the record they are given with:
 * 1. **build**: {@link buildPayload} of each extension adds its contribution
 *    to the payload. The phase completes before any item is read, so the
 *    second phase always sees the whole query.
 * 2. **read**: {@link readItems} of each extension wraps the reading, like a
 *    middleware. The extensions form an onion around the reader of the data
 *    source: the first key is the outermost layer, the reader is the core,
 *    and `next(payload)` hands the payload to the next layer in. An
 *    extension without the hook is skipped.
 *
 * The order of the keys is up to the consumer and it matters: e.g. the
 * `filtering` key must precede the `pagination` one for the count reader to
 * receive the filters. In the read phase it also sets the order of the
 * transformations: the result of `next` flows outward, so the **outermost
 * extension transforms last**.
 *
 * Both hooks receive the `AbortSignal` of the read, aborted when a newer read
 * supersedes it, for the reads of their own (a hook that reads something
 * hands it to its reader, the others ignore it). `next` has the signal bound
 * already: nothing to forward. Once the signal is aborted the data source
 * stops the cycle: the remaining hooks and the reader are not invoked, and a
 * `next` called after the abort rejects with the `AbortedException` of
 * ts-core. An implementer declaring fewer parameters still type-checks.
 * @example
 * ```ts
 * // A read-through cache: a hit skips `next`, hence the reader.
 * class CacheExtension<TItem>
 *   extends Subscribable<EventsDefinition>
 *   implements IDataSourceExtension<TItem>
 * {
 *   private readonly _cache = new Map<string, List<TItem>>();
 *   public async readItems(payload: DataSourcePayload<TItem>, next: DataSourceReadNext<TItem>) {
 *     const key = createHash(payload);
 *     const hit = this._cache.get(key);
 *     if (hit) return hit;
 *     const items = await next(payload);
 *     this._cache.set(key, items);
 *     return items;
 *   }
 * }
 * ```
 * @example
 * ```ts
 * // A backend accepting one sort per call: one read per sort, results merged.
 * class OneSortPerCallExtension<TItem>
 *   extends Subscribable<EventsDefinition>
 *   implements IDataSourceExtension<TItem>
 * {
 *   public async readItems(payload: DataSourcePayload<TItem>, next: DataSourceReadNext<TItem>) {
 *     const sorts = payload.sorts ?? [];
 *     if (sorts.length < 2) return next(payload);
 *     const reads = await Promise.all(sorts.map((sort) => next({ ...payload, sorts: [sort] })));
 *     return merge(reads);
 *   }
 * }
 * const users = createDataSource(readUsers, { filtering, cache: new CacheExtension<User>() });
 * ```
 */
export interface IDataSourceExtension<
  TItem = Any,
  TEvents extends EventsDefinition = EventsDefinition,
> extends ISubscribable<TEvents> {
  /**
   * Adds the contribution of the extension to the payload. Build phase, run
   * in the order of the keys and completed before any item is read.
   * @param payload Payload built by the previous extensions.
   * @param signal Signal of the read, aborted when the read is superseded.
   * @returns the payload for the next extension.
   */
  buildPayload?(
    payload: DataSourcePayload<TItem>,
    signal?: AbortSignal,
  ): Promise<DataSourcePayload<TItem>>;
  /**
   * Wraps the reading of the items. Read phase: the extension is a layer of
   * the onion around the reader, `next` the layers inside it (the inner
   * extensions, then the reader of the data source). The payload is the
   * whole query, whatever the position of the extension.
   *
   * `next` may be called zero times (e.g. a cache hit: the reader is never
   * invoked), once, with this or another payload, or several times (e.g. a
   * payload split into several reads whose results are merged); every call
   * runs the inner layers and the reader again, so the hooks and the events
   * of the inner extensions may fire as many times. The result may be
   * transformed before being returned, and flows outward: the outermost
   * extension transforms last.
   * @param payload The whole query, built by the build phase.
   * @param next Reads the items through the inner layers and the reader; the
   * signal of the read is bound already.
   * @param signal Signal of the read, aborted when the read is superseded,
   * for the reads of the extension itself.
   * @returns the items for the outer extension, or the data source.
   */
  readItems?(
    payload: DataSourcePayload<TItem>,
    next: DataSourceReadNext<TItem>,
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
