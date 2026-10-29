import {
  AbortableDelegate,
  Any,
  ConstructorOf,
  DebouncedDelegate,
  EventsDefinition,
  List,
  Nullable,
  Subscribable,
} from "@mantlebee/ts-core";

import { IDataSource, IDataSourceExtension } from "./interfaces";
import {
  DataSourceEvents,
  DataSourceExtensionOptions,
  DataSourcePayload,
  DataSourceReader,
} from "./types";

/**
 * Default quiet time, in milliseconds, of the debounced `*Change` events.
 */
export const DataSourceExtensionChangeDelayDefault = 100;

/**
 * Base class of the extensions shipped with the package: a
 * `Subscribable` of ts-core with a cancellable, debounced `*Change` event.
 * Subclasses call {@link _scheduleChange} after every mutation and raise
 * their own event in {@link _triggerChange}. Custom extensions do not have to
 * extend it: implementing {@link IDataSourceExtension} is enough.
 * @typeParam TItem Type of the items of the data source.
 * @typeParam TEvents Events of the extension.
 */
export abstract class DataSourceExtension<
    TItem = Any,
    TEvents extends EventsDefinition = EventsDefinition,
  >
  extends Subscribable<TEvents>
  implements IDataSourceExtension<TItem, TEvents>
{
  protected readonly _changeDelay: number;
  private readonly _changeDelegate: DebouncedDelegate;

  /**
   * @param options Debounce of the `*Change` event.
   */
  public constructor(options?: DataSourceExtensionOptions) {
    super();
    this._changeDelay =
      options?.changeDelay ?? DataSourceExtensionChangeDelayDefault;
    this._changeDelegate = new DebouncedDelegate(
      () => this._triggerChange(),
      this._changeDelay,
    );
  }

  /**
   * Cancels the pending `*Change` event and removes every handler.
   */
  public async dispose(): Promise<void> {
    this._changeDelegate.abort();
    await super.dispose();
  }

  /**
   * Raises the `*Change` event of the extension.
   */
  protected abstract _triggerChange(): void;

  /**
   * Schedules the `*Change` event after the quiet time, restarting the wait
   * if one is already pending.
   */
  protected _scheduleChange(): void {
    this._changeDelegate.call();
  }
}

/**
 * Data source driven only by its extensions: it knows nothing about filters,
 * pagination and so on, it just runs the read cycle described in
 * {@link IDataSourceExtension}, invoking the extensions in array order.
 * Choose the order on purpose: e.g. the `FilterExtension` must precede the
 * `PaginationExtension` for the count reader to receive the filters.
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
 * const paginating = new PaginationExtension<User>(countUsers, 20);
 * const dataSource = new DataSource<User>(
 *   (payload, signal) => api.getUsers(payload, { signal }),
 *   [filtering, paginating],
 * );
 * dataSource.on("items", (users) => render(users));
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
 */
export class DataSource<TItem = Any>
  extends Subscribable<DataSourceEvents<TItem>>
  implements IDataSource<TItem>
{
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

  protected readonly _extensions: List<IDataSourceExtension<TItem>>;
  protected readonly _reader: DataSourceReader<TItem>;

  /**
   * @param reader Resolves the payload into the items; receives the signal
   * of the read as second argument.
   * @param extensions Extensions, invoked in array order.
   */
  public constructor(
    reader: DataSourceReader<TItem>,
    extensions: List<IDataSourceExtension<TItem>> = [],
  ) {
    super();
    this._extensions = extensions;
    this._reader = reader;
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
   * every extension.
   */
  public async dispose(): Promise<void> {
    this._readDelegate.abort();
    await this._eventBus.dispose();
    for (const extension of this._extensions) await extension.dispose();
  }

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
