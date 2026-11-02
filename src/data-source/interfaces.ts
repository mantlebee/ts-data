import { Any, ISubscribable, List } from "@mantlebee/ts-core";

import type {
  DataSourceExtensionProperties,
  DataSourceExtensionsDefinition,
} from "./extensions/types";
import type { DataSourceEvents } from "./types";

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
 * value may be `undefined` is an optional one, to narrow on; a key not in
 * the record is not a property. The data source knows no key: the extensions
 * of the package are named through {@link IDataSourceWith}
 * (`IDataSourceWith<User, "filtering" | "pagination">`), the shortcut for
 * the record of their interfaces. A source with more extensions is
 * assignable to a parameter asking for fewer, never the opposite, and the
 * default, an empty record, guarantees nothing. {@link createDataSource}
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
 * function bindGrid(source: IDataSourceWith<User, "filtering" | "pagination">) {
 *   source.filtering.addFilter(adult); // guaranteed by the type
 *   source.pagination.goToNextPage();
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
 * @typeParam TExt Record of the extensions by key.
 */
export type IDataSource<
  TItem = Any,
  TExt extends DataSourceExtensionsDefinition<TItem> = Record<never, never>,
> = IDataSourceBase<TItem> & DataSourceExtensionProperties<TExt>;
