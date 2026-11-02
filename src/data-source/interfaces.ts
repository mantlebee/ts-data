import { Any, EventsDefinition, ISubscribable, List } from "@mantlebee/ts-core";

import type {
  DataSourceCapability,
  DataSourceEvents,
  DataSourceExtensionProperties,
  DataSourceExtensionsDefinition,
  DataSourceExtensionsOf,
  DataSourcePayload,
} from "./types";

/**
 * The members of a data source that do not depend on its extensions: the
 * state and the read cycle. {@link IDataSource} adds the keyed extensions;
 * annotate with that one.
 * @typeParam TItem Type of the items.
 */
export interface IDataSourceBase<TItem = Any> extends ISubscribable<
  DataSourceEvents<TItem>
> {
  /**
   * `true` from the first `read()` until the latest one settles: a read
   * superseded by a newer one does not reset it.
   */
  readonly isReading: boolean;
  /** Items of the latest completed read; a superseded read never sets them. */
  readonly items: List<TItem>;
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
 * **Extensions in the type.** `TExt` is the record of the extensions of the
 * source, by key ({@link DataSourceExtensionsDefinition}), the way the
 * events of a `Subscribable` of ts-core are a record. Every key whose value
 * cannot be `undefined` is a required readonly property, every key whose
 * value may be `undefined` and every key of {@link DataSourceCapabilities}
 * not in the record is an optional one, to narrow on. A union of the keys
 * of the package is a shorthand: `IDataSource<User, "filtering" |
 * "pagination">` has `filtering` and `pagination` for sure, `sorting?` and
 * `projection?` to check (`if (source.sorting) ...`). A source with more
 * extensions is assignable to a parameter asking for fewer, never the
 * opposite, and the default, an empty record, guarantees nothing.
 * {@link createDataSource}
 * infers `TExt` from the record it is given, custom keys included: no
 * registration anywhere.
 *
 * This is a type alias, not an interface: TypeScript does not let an
 * interface extend a mapped type over a generic record. Extend or implement
 * it with concrete type arguments only; {@link IDataSourceBase} holds the
 * members that do not depend on the extensions.
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
 * const users = createDataSource(readUsers, { filtering, pagination, sorting, distinct });
 * bindGrid(users); // more extensions than asked: fits
 * users.distinct; // DistinctExtension<User>, a custom key
 * users.on("items", (items) => render(items));
 * users.read().catch((error) => {
 *   if (!isAbortedException(error)) throw error; // superseded: nothing to do
 * });
 * ```
 * @typeParam TItem Type of the items.
 * @typeParam TExt Record of the extensions by key, or a union of the keys of
 * the package ones.
 */
export type IDataSource<
  TItem = Any,
  TExt extends DataSourceExtensionsDefinition<TItem> | DataSourceCapability =
    Record<never, never>,
> = IDataSourceBase<TItem> &
  DataSourceExtensionProperties<TItem, DataSourceExtensionsOf<TItem, TExt>>;

/**
 * Hooks of the read cycle of an {@link IDataSource}. Every hook is optional
 * and the extensions are invoked in pipeline order:
 * 1. `getItemsBefore` of each extension builds the payload;
 * 2. the reader resolves the payload into the items;
 * 3. `getItemsAfter` of each extension may transform the items.
 * An error thrown by the reader or by a hook propagates as a read error.
 * The pipeline order is owned by the data source: `filtering`, `sorting`,
 * `pagination`, `projection`, then the custom keys in insertion order of the
 * record (see {@link DataSource}); so the count reader of the pagination
 * always receives the filters and the sorts.
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
