import {
  Any,
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
  DataSourceCapability,
  DataSourceEvents,
  DataSourcePayload,
} from "./types";

/**
 * The extensions a data source may expose, by key. The keys are the
 * **interfaces**, not the classes: a `FilterExtensionWithFixedFilters` is a
 * `filtering`, a `SingleSortExtension` is a `sorting`. A data source declares
 * the keys it guarantees in its type ({@link IDataSource}) and exposes every
 * extension it was given under its key, so a consumer reads `source.filtering`
 * instead of probing the classes with `getExtension`.
 *
 * Consumers may add their own keys by augmenting this interface; an augmented
 * key runs after the known ones, in insertion order of the record given to
 * {@link createDataSource} (see the README).
 * @example
 * ```ts
 * declare module "@mantlebee/ts-data" {
 *   interface DataSourceCapabilities<TItem> {
 *     distinct: DistinctExtension<TItem>;
 *   }
 * }
 * ```
 * @typeParam TItem Type of the items.
 */
export interface DataSourceCapabilities<TItem = Any> {
  filtering: IFilterExtension<TItem>;
  pagination: IPaginationExtension<TItem>;
  projection: IProjectionExtension<TItem>;
  sorting: ISortExtension<TItem>;
}

/**
 * The members of a data source that do not depend on its capabilities: the
 * state, the read cycle and the deprecated lookup by class. {@link IDataSource}
 * adds the keyed extensions; annotate with that one.
 * @typeParam TItem Type of the items.
 */
export interface IDataSourceBase<TItem = Any>
  extends ISubscribable<DataSourceEvents<TItem>> {
  /**
   * `true` from the first `read()` until the latest one settles: a read
   * superseded by a newer one does not reset it.
   */
  readonly isReading: boolean;
  /** Items of the latest completed read; a superseded read never sets them. */
  readonly items: List<TItem>;
  /**
   * Finds an extension by class. TypeScript cannot infer the item type of a
   * generic extension class from its constructor: without a type argument
   * the result is typed with the default item type (`FilterExtension<Any>`,
   * methods available but fields unchecked); pass the type argument to get
   * the complete type: `getExtension<FilterExtension<Item>>(FilterExtension)`.
   * @deprecated Use the keyed properties (`filtering`, `pagination`,
   * `projection`, `sorting` and the augmented keys): they are part of the
   * type of the source and need no class probing. Removed in 2.0.
   * @param constructor Class of the extension to find.
   * @returns the first extension that is an instance of `constructor`, or `null`.
   */
  getExtension<TExtension extends IDataSourceExtension<TItem>>(
    constructor: ConstructorOf<TExtension>,
  ): Nullable<TExtension>;
  /**
   * Runs the read cycle and updates {@link items}. Rejects with the error of
   * the reader or of an extension, after raising the `error` event.
   *
   * A newer `read()` (or `dispose()`) supersedes a running one: the superseded
   * `read()` rejects with the `AbortedException` of ts-core, without `error`
   * event, and its result is discarded. A consumer awaiting `read()` ignores
   * that rejection with `isAbortedException`; one that only listens to
   * `items` and `error` has nothing to handle.
   * @example
   * ```ts
   * try {
   *   await users.read();
   * } catch (error) {
   *   if (!isAbortedException(error)) throw error; // a newer read superseded this one
   * }
   * ```
   */
  read(): Promise<void>;
}

/**
 * Reads items through a reader, letting its extensions shape the query and
 * the result. See {@link IDataSourceExtension} for the read cycle.
 *
 * **Capabilities.** `TCaps` lists the keys of {@link DataSourceCapabilities}
 * the source guarantees: each one is a required readonly property, every
 * other known capability is an optional one to narrow on.
 * `IDataSource<User, "filtering" | "pagination">` has `filtering` and
 * `pagination` for sure and `sorting?` / `projection?` to check
 * (`if (source.sorting) ...`). A source with more capabilities is assignable
 * to a parameter asking for fewer, never the opposite, and the default
 * `never` guarantees nothing, as a plain `IDataSource<User>` always did.
 * {@link createDataSource} infers `TCaps` from the record of extensions it is
 * given.
 *
 * This is a type alias, not an interface: TypeScript does not let an
 * interface extend a `Pick` over a generic key. Extend or implement it with
 * concrete type arguments only; {@link IDataSourceBase} holds the members
 * that do not depend on the capabilities.
 *
 * **The latest read wins**: a `read()` requested while another is running
 * supersedes it. The superseded `read()` rejects with the `AbortedException`
 * of ts-core at once, its result is discarded (no `items`, no `error`), and
 * `items` always hold the result of the latest completed read.
 * @example
 * ```ts
 * function bindGrid(source: IDataSource<User, "filtering" | "pagination">) {
 *   source.filtering.addFilter(adult); // guaranteed by the type
 *   source.pagination.goToNextPage();
 *   if (source.sorting) source.sorting.addSort({ field: "name", asc: true }); // optional
 * }
 * const users = createDataSource(readUsers, { filtering, pagination, sorting });
 * bindGrid(users); // IDataSource<User, "filtering" | "pagination" | "sorting"> fits
 * users.on("items", (items) => render(items));
 * users.read().catch((error) => {
 *   if (!isAbortedException(error)) throw error; // superseded: nothing to do
 * });
 * ```
 * @typeParam TItem Type of the items.
 * @typeParam TCaps Keys of the capabilities the source guarantees.
 */
export type IDataSource<
  TItem = Any,
  TCaps extends DataSourceCapability = never,
> = IDataSourceBase<TItem> &
  Readonly<Pick<DataSourceCapabilities<TItem>, TCaps>> &
  Readonly<Partial<Omit<DataSourceCapabilities<TItem>, TCaps>>>;

/**
 * Hooks of the read cycle of an {@link IDataSource}. Every hook is optional
 * and the extensions are invoked in pipeline order:
 * 1. `getItemsBefore` of each extension builds the payload;
 * 2. the reader resolves the payload into the items;
 * 3. `getItemsAfter` of each extension may transform the items.
 * An error thrown by the reader or by a hook propagates as a read error.
 * The pipeline order is owned by the data source: `filtering`, `sorting`,
 * `pagination`, `projection`, then the extensions given as `others`, then
 * the augmented keys (see {@link DataSource}); so the count reader of the
 * pagination always receives the filters and the sorts.
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
