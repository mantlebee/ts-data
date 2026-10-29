import {
  Any,
  ConstructorOf,
  EventsDefinition,
  ISubscribable,
  List,
  Nullable,
} from "@mantlebee/ts-core";

import type { DataSourceEvents, DataSourcePayload } from "./types";

/**
 * Reads items through a reader, letting its extensions shape the query and
 * the result. See {@link IDataSourceExtension} for the read cycle.
 *
 * **The latest read wins**: a `read()` requested while another is running
 * supersedes it. The superseded `read()` rejects with the `AbortedException`
 * of ts-core at once, its result is discarded (no `items`, no `error`), and
 * {@link items} always hold the result of the latest completed read.
 * @example
 * ```ts
 * const users: IDataSource<User> = new DataSource<User>(readUsers, [filtering]);
 * users.on("items", (items) => render(items));
 * users.on("isReading", (isReading) => spinner.toggle(isReading));
 * users.read().catch((error) => {
 *   if (!isAbortedException(error)) throw error; // superseded: nothing to do
 * });
 * ```
 */
export interface IDataSource<TItem = Any>
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
 * Hooks of the read cycle of an {@link IDataSource}. Every hook is optional
 * and the extensions are invoked in array order:
 * 1. `getItemsBefore` of each extension builds the payload;
 * 2. the reader resolves the payload into the items;
 * 3. `getItemsAfter` of each extension may transform the items.
 * An error thrown by the reader or by a hook propagates as a read error.
 * The order of the array is up to the consumer: e.g. a `FilterExtension`
 * must precede a `PaginationExtension` for the count reader to receive the
 * filters.
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
