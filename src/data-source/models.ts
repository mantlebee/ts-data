import {
  AbortableDelegate,
  Any,
  ConstructorOf,
  List,
  Nullable,
  Subscribable,
} from "@mantlebee/ts-core";

import { FilterExtension } from "./filtering/models";
import { IDataSource, IDataSourceExtension } from "./interfaces";
import { PaginationExtension } from "./pagination/models";
import { ProjectionExtension } from "./projection/models";
import { SortExtension } from "./sorting/models";
import {
  DataSourceCapability,
  DataSourceCapabilityProperty,
  DataSourceEvents,
  DataSourceExtensions,
  DataSourcePayload,
  DataSourceReader,
} from "./types";

/**
 * The known capabilities in the order the data source runs them: the filters
 * and the sorts before the pagination, so the count reader receives them and
 * the page reset watches them; the projection last. The augmented keys follow,
 * in insertion order of the record, after the `others`.
 */
export const DataSourceCapabilitiesOrder: List<DataSourceCapability> = [
  "filtering",
  "sorting",
  "pagination",
  "projection",
];

/**
 * The classes of the package by the capability they implement, used to fill
 * the keyed properties from a plain list of extensions (the deprecated form of
 * the constructor). A subclass counts as its base: a
 * `FilterExtensionWithFixedFilters` is a `filtering`, a `SingleSortExtension`
 * a `sorting`.
 */
const knownClasses: List<[DataSourceCapability, ConstructorOf<Any>]> = [
  ["filtering", FilterExtension],
  ["sorting", SortExtension],
  ["pagination", PaginationExtension],
  ["projection", ProjectionExtension],
];

/**
 * Data source driven only by its extensions: it knows nothing about filters,
 * pagination and so on, it just runs the read cycle described in
 * {@link IDataSourceExtension} over its pipeline of extensions.
 *
 * **Capabilities.** The extensions are given by key
 * ({@link DataSourceExtensions}) and exposed under the same key as readonly
 * properties (`filtering`, `pagination`, `projection`, `sorting`, plus the
 * augmented keys), set only when given: `"sorting" in source` is `false` for a
 * source without sorting. The pipeline order is canonical and owned by the
 * data source ({@link DataSourceCapabilitiesOrder}): `filtering`, `sorting`,
 * `pagination`, `projection`, then the `others` in array order, then the
 * augmented keys in insertion order of the record; whatever the key order of
 * the record, the count reader of the pagination receives the filters.
 *
 * `TCaps` are the capabilities the type guarantees. The constructor cannot
 * infer them from the record: build a source with {@link createDataSource},
 * which does, or state them by hand (`new DataSource<User, "filtering">`).
 * Without them the keyed properties are typed as possibly `undefined`.
 *
 * **The latest read wins.** The read cycle runs in one `AbortableDelegate` of
 * ts-core: a `read()` requested while another is running aborts it, so the
 * superseded `read()` rejects with `AbortedException` at once, its signal is
 * aborted (the reader and the hooks receive it, e.g. for `fetch`) and the
 * cycle stops at the next `await` without touching `items` nor raising
 * `items` or `error`. `items` and the `items` event therefore always come
 * from the latest read, whatever the order the readers resolve in, and
 * {@link isReading} stays `true` until the latest read settles. `dispose()`
 * aborts the running read the same way.
 * @example
 * ```ts
 * const filtering = new FilterExtension<User>();
 * const pagination = new PaginationExtension<User>(countUsers, 20);
 * const dataSource = createDataSource(
 *   (payload, signal) => api.getUsers(payload, { signal }),
 *   { filtering, pagination },
 * ); // IDataSource<User, "filtering" | "pagination">
 * dataSource.on("items", (users) => render(users));
 * dataSource.filtering.on("filtersChange", () => dataSource.read());
 * await dataSource.read();
 * ```
 * @example
 * ```ts
 * // Two reads in a row: the first rejects with AbortedException, the second
 * // is the one that sets `items`, even if the first reader resolves last.
 * dataSource.read().catch((error) => {
 *   if (!isAbortedException(error)) throw error;
 * });
 * await dataSource.read();
 * ```
 * @typeParam TItem Type of the items.
 * @typeParam TCaps Keys of the capabilities the type guarantees.
 */
export class DataSource<TItem = Any, TCaps extends DataSourceCapability = never>
  extends Subscribable<DataSourceEvents<TItem>>
  implements IDataSource<TItem>
{
  /** The filtering extension, when given. */
  declare public readonly filtering: DataSourceCapabilityProperty<
    TItem,
    TCaps,
    "filtering"
  >;
  /** The pagination extension, when given. */
  declare public readonly pagination: DataSourceCapabilityProperty<
    TItem,
    TCaps,
    "pagination"
  >;
  /** The projection extension, when given. */
  declare public readonly projection: DataSourceCapabilityProperty<
    TItem,
    TCaps,
    "projection"
  >;
  /** The sorting extension, when given. */
  declare public readonly sorting: DataSourceCapabilityProperty<
    TItem,
    TCaps,
    "sorting"
  >;

  /**
   * Mirror of `_readDelegate.isRunning`, kept by hand because the getter and
   * the `isReading` event must never disagree: `isRunning` has no event, so
   * the transitions are detected in {@link read} (set before the call, reset
   * when the latest call settles) and the event is raised there, on actual
   * transitions only. Reading `isRunning` in the getter would expose a value
   * the event has not announced yet (or no longer matches) for the span of a
   * microtask.
   */
  private _isReading = false;
  private _items: List<TItem> = [];
  /** The current read cycle: a new call supersedes the running one. */
  private readonly _readDelegate = new AbortableDelegate<[], void>((signal) =>
    this._runReadCycle(signal),
  );

  /** The pipeline: every extension, keyed or not, in invocation order. */
  protected readonly _extensions: List<IDataSourceExtension<TItem>>;
  protected readonly _reader: DataSourceReader<TItem>;

  /**
   * @param reader Resolves the payload into the items; receives the signal
   * of the read as second argument.
   * @param extensions Extensions by key, run in the canonical order and
   * exposed under their key. A plain list is still accepted (**deprecated**,
   * removed in 2.0): it runs in array order and the keyed properties are
   * filled by `instanceof` on the classes of the package.
   * @param others Extensions without a key, run after the keyed ones in
   * array order (after the list, with the list form).
   */
  public constructor(
    reader: DataSourceReader<TItem>,
    extensions:
      | DataSourceExtensions<TItem>
      | List<IDataSourceExtension<TItem>> = {},
    others: List<IDataSourceExtension<TItem>> = [],
  ) {
    super();
    this._reader = reader;
    this._extensions = Array.isArray(extensions)
      ? this._fromList(extensions, others)
      : this._fromRecord(extensions, others);
  }

  public get isReading(): boolean {
    return this._isReading;
  }
  public get items(): List<TItem> {
    return this._items;
  }

  /**
   * Aborts the running read (its `read()` rejects with `AbortedException`
   * and it raises no event afterwards), removes every handler and disposes
   * every extension, keyed or not.
   */
  public async dispose(): Promise<void> {
    this._readDelegate.abort();
    await this._eventBus.dispose();
    for (const extension of this._extensions) await extension.dispose();
  }

  /**
   * Finds an extension by class, among the keyed ones and the `others`.
   * @deprecated Use the keyed properties (`filtering`, `pagination`,
   * `projection`, `sorting` and the augmented keys). Removed in 2.0.
   * @param constructor Class of the extension to find.
   * @returns the first extension that is an instance of `constructor`, or `null`.
   */
  public getExtension<TExtension extends IDataSourceExtension<TItem>>(
    constructor: ConstructorOf<TExtension>,
  ): Nullable<TExtension> {
    const extension = this._extensions.find((a) => a instanceof constructor);
    return (extension as TExtension | undefined) ?? null;
  }

  /**
   * Runs the read cycle and updates {@link items}. Rejects with the error of
   * the reader or of an extension, after raising the `error` event.
   *
   * A `read()` requested while another is running supersedes it: the
   * superseded `read()` rejects with the `AbortedException` of ts-core at
   * once, raises no `error` event and leaves `items` untouched; the new one
   * runs. A consumer awaiting `read()` ignores the supersession with
   * `isAbortedException`; a consumer that only listens to `items` and
   * `error` has nothing to handle. Note that a `read()` requested from a
   * handler raised during the cycle (e.g. the `page` event of a pagination
   * going back to a valid page) supersedes the running read as well.
   * @example
   * ```ts
   * try {
   *   await dataSource.read();
   * } catch (error) {
   *   if (!isAbortedException(error)) throw error; // a newer read superseded this one
   * }
   * ```
   */
  public async read(): Promise<void> {
    this._setIsReading(true);
    try {
      await this._readDelegate.call();
    } finally {
      // A superseded read settles while the newer one runs: only the latest
      // read, the one that leaves the delegate idle, ends the burst.
      if (!this._readDelegate.isRunning) this._setIsReading(false);
    }
  }

  /**
   * Builds the pipeline from a plain list (the deprecated form): the list in
   * its order, then `others`. The keyed properties are filled by `instanceof`
   * on the classes of the package, the first instance of each winning as in
   * {@link getExtension}.
   */
  private _fromList(
    extensions: List<IDataSourceExtension<TItem>>,
    others: List<IDataSourceExtension<TItem>>,
  ): List<IDataSourceExtension<TItem>> {
    for (const [key, constructor] of knownClasses) {
      const extension = extensions.find((a) => a instanceof constructor);
      if (extension) this._setCapability(key, extension);
    }
    return [...extensions, ...others];
  }
  /**
   * Builds the pipeline from the record: the known keys in the canonical
   * order, then `others`, then the augmented keys in insertion order. A key
   * set to `undefined` is skipped: no property, nothing in the pipeline.
   */
  private _fromRecord(
    extensions: DataSourceExtensions<TItem>,
    others: List<IDataSourceExtension<TItem>>,
  ): List<IDataSourceExtension<TItem>> {
    const record = extensions as Record<string, IDataSourceExtension<TItem>>;
    const known: List<string> = DataSourceCapabilitiesOrder;
    const augmented = Object.keys(record).filter((key) => !known.includes(key));
    const keyed = (keys: List<string>) =>
      keys
        .filter((key) => record[key] !== undefined)
        .map((key) => {
          this._setCapability(key, record[key]);
          return record[key];
        });
    return [
      ...keyed(DataSourceCapabilitiesOrder),
      ...others,
      ...keyed(augmented),
    ];
  }
  /**
   * Defines the keyed property as an own property, so that `key in source`
   * tells whether the capability is there. The property types are
   * conditional on `TCaps`, hence the untyped write.
   */
  private _setCapability(
    key: string,
    extension: IDataSourceExtension<TItem>,
  ): void {
    (this as unknown as Record<string, IDataSourceExtension<TItem>>)[key] =
      extension;
  }
  /**
   * The function of the delegate: one read cycle. Returns at once, without
   * touching the state, as soon as the signal is aborted; an error of the
   * reader or of a hook is raised as `error` and rethrown, unless the read
   * was superseded meanwhile (e.g. `fetch` rejecting with its `AbortError`).
   */
  private async _runReadCycle(signal: AbortSignal): Promise<void> {
    try {
      const payload = await this._getItemsBefore({}, signal);
      if (signal.aborted) return;
      const read = await this._reader(payload, signal);
      if (signal.aborted) return;
      const items = await this._getItemsAfter(read, payload, signal);
      if (signal.aborted) return;
      this._items = items;
      this._eventBus.trigger("items", items);
    } catch (error) {
      if (signal.aborted) return;
      this._eventBus.trigger("error", error);
      throw error;
    }
  }
  private async _getItemsAfter(
    items: List<TItem>,
    payload: DataSourcePayload<TItem>,
    signal: AbortSignal,
  ): Promise<List<TItem>> {
    for (const extension of this._extensions) {
      if (signal.aborted) return items;
      if (extension.getItemsAfter)
        items = await extension.getItemsAfter(items, payload, signal);
    }
    return items;
  }
  private async _getItemsBefore(
    payload: DataSourcePayload<TItem>,
    signal: AbortSignal,
  ): Promise<DataSourcePayload<TItem>> {
    for (const extension of this._extensions) {
      if (signal.aborted) return payload;
      if (extension.getItemsBefore)
        payload = await extension.getItemsBefore(payload, signal);
    }
    return payload;
  }
  /** Updates the flag and raises `isReading` only when the value changes. */
  private _setIsReading(isReading: boolean): void {
    if (this._isReading === isReading) return;
    this._isReading = isReading;
    this._eventBus.trigger("isReading", isReading);
  }
}
