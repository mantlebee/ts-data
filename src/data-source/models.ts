import {
  AbortableDelegate,
  AbortedException,
  Any,
  List,
  Subscribable,
} from "@mantlebee/ts-core";

import { IDataSourceExtension } from "./extensions/interfaces";
import {
  DataSourceExtensionsDefinition,
  DataSourceReadNext,
} from "./extensions/types";
import { IDataSource } from "./interfaces";
import { DataSourceEvents, DataSourcePayload, DataSourceReader } from "./types";

/**
 * Data source driven only by its extensions: it knows nothing about filters,
 * pagination and so on, it just runs the read cycle described in
 * {@link IDataSourceExtension} over its pipeline of extensions: the build
 * phase (`buildPayload` of each extension, in the order of the keys), then
 * the read phase (`readItems` of each extension as an onion around the
 * reader, the first key outermost).
 *
 * **Extensions by key.** The extensions are given as a record
 * ({@link DataSourceExtensionsDefinition}) and exposed under the same keys as
 * readonly own properties, set only when given: `"sorting" in source` is
 * `false` for a source without sorting. The pipeline runs them **in the order
 * of the keys of the record**, the order they are written in (JavaScript lists
 * integer-like keys first: name the extensions). The order is yours and it
 * matters: write `filtering` before `pagination`, so the count reader
 * receives the filters; in the read phase the first key wraps the others,
 * so it transforms the items last. A key that is already a member of the
 * source (`items`, `read`, …) is refused.
 *
 * The class cannot type its members from a generic record, so it exposes no
 * keyed property in its type. Build a source with {@link createDataSource},
 * which returns the {@link IDataSource} typed with every key of the record.
 *
 * **Inheritance.** The class is exported to be extended, not to be built
 * with `new`: a subclass knows its extensions, so it types the keys itself,
 * one `declare readonly` per key given to `super`. `declare` matters: it
 * emits nothing, where a plain field declaration would, under
 * `useDefineForClassFields` (the default from the `ES2022` target on),
 * redefine the property to `undefined` after `super` has set it. The
 * compiler does not check the declarations against the record, the
 * subclass keeps them in line. A subclass reaches the pipeline
 * (`_extensions`), the reader (`_reader`) and the `_eventBus`; a method or
 * an accessor it adds is refused as a key like the members of the class.
 *
 * **The latest read wins.** The read cycle runs in one `AbortableDelegate` of
 * ts-core: a `read()` requested while another is running aborts it, so the
 * superseded `read()` rejects with `AbortedException` at once, its signal is
 * aborted (the reader and the hooks receive it, e.g. for `fetch`) and the
 * cycle stops at the next `await` without touching `items` nor raising
 * `items` or `error`: the remaining `buildPayload` hooks are not invoked,
 * and every layer of the read phase, `next` included, rejects with
 * `AbortedException` instead of running. `items` and the `items` event therefore always come
 * from the latest read, whatever the order the readers resolve in, and
 * {@link isReading} stays `true` until the latest read settles. `dispose()`
 * aborts the running read the same way.
 * @example
 * ```ts
 * const filtering = new FilterExtension<User>();
 * const pagination = new PaginationExtension<User>(countUsers, 20);
 * const dataSource = createDataSource(
 *   (payload, signal) => api.getUsers(payload, { signal }),
 *   { filtering, pagination }, // filtering first: the count receives the filters
 * ); // IDataSource<User, { filtering: FilterExtension<User>; pagination: PaginationExtension<User> }>
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
 * @example
 * ```ts
 * // A subclass: the keys are declared, the record is given to `super`.
 * class UsersDataSource extends DataSource<User> {
 *   declare public readonly filtering: FilterExtension<User>;
 *   declare public readonly pagination: PaginationExtension<User>;
 *
 *   public constructor() {
 *     super((payload, signal) => api.getUsers(payload, { signal }), {
 *       filtering: new FilterExtension<User>(),
 *       pagination: new PaginationExtension<User>(countUsers, 20),
 *     });
 *   }
 *
 *   public async readAdults(): Promise<void> {
 *     this.filtering.setFilters([adult]);
 *     await this.read();
 *   }
 * }
 * const users: IDataSourceWith<User, "filtering" | "pagination"> =
 *   new UsersDataSource();
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

  /** The pipeline: every extension given, in the order of the keys. */
  protected readonly _extensions: List<IDataSourceExtension<TItem>>;
  protected readonly _reader: DataSourceReader<TItem>;

  /**
   * @param reader Resolves the payload into the items; receives the signal
   * of the read as second argument.
   * @param extensions Extensions by key, run in the order of the keys and
   * exposed under their key; a key set to `undefined` is skipped.
   * @throws when a key is already a member of the data source.
   */
  public constructor(
    reader: DataSourceReader<TItem>,
    extensions: DataSourceExtensionsDefinition<TItem> = {},
  ) {
    super();
    this._reader = reader;
    this._extensions = this._buildPipeline(extensions);
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
   * Builds the pipeline and defines the keyed properties, in the order of
   * the keys of the record. A key set to `undefined` is skipped: no
   * property, nothing in the pipeline. A key that would overwrite a member
   * of the data source is refused.
   */
  private _buildPipeline(
    extensions: DataSourceExtensionsDefinition<TItem>,
  ): List<IDataSourceExtension<TItem>> {
    const pipeline: List<IDataSourceExtension<TItem>> = [];
    for (const key of Object.keys(extensions)) {
      const extension = extensions[key];
      if (extension === undefined) continue;
      if (key in this)
        throw new Error(
          `"${key}" is a member of the data source: use another key for the extension`,
        );
      // An own property, so that `key in source` tells whether the
      // extension is there; the class types none of them.
      (this as unknown as Record<string, IDataSourceExtension<TItem>>)[key] =
        extension;
      pipeline.push(extension);
    }
    return pipeline;
  }
  /**
   * The function of the delegate: one read cycle, the build phase then the
   * read phase. Returns at once, without touching the state, as soon as the
   * signal is aborted; an error of the reader or of a hook is raised as
   * `error` and rethrown, unless the read was superseded meanwhile (the
   * `AbortedException` of a layer, or `fetch` rejecting with its
   * `AbortError`).
   */
  private async _runReadCycle(signal: AbortSignal): Promise<void> {
    try {
      const payload = await this._buildPayload({}, signal);
      if (signal.aborted) return;
      const items = await this._composeReadItems(signal)(payload);
      if (signal.aborted) return;
      this._items = items;
      this._eventBus.trigger("items", items);
    } catch (error) {
      if (signal.aborted) return;
      this._eventBus.trigger("error", error);
      throw error;
    }
  }
  /**
   * The build phase: `buildPayload` of each extension, in the order of the
   * keys. Stops, returning the payload built so far, once the signal is
   * aborted; the caller checks the signal.
   */
  private async _buildPayload(
    payload: DataSourcePayload<TItem>,
    signal: AbortSignal,
  ): Promise<DataSourcePayload<TItem>> {
    for (const extension of this._extensions) {
      if (signal.aborted) return payload;
      if (extension.buildPayload)
        payload = await extension.buildPayload(payload, signal);
    }
    return payload;
  }
  /**
   * The read phase, composed from the inside out: the reader is the core,
   * every extension with `readItems` wraps the layers built so far, so the
   * first key ends up outermost. Every layer, the core included, checks the
   * signal before and after running and rejects with `AbortedException` once
   * aborted: in a chain a result returned in silence (the reader resolving
   * late, an extension swallowing the rejection of `next`) would be
   * processed by the outer layers. The signal is bound in `next`, so an
   * extension has nothing to forward.
   */
  private _composeReadItems(signal: AbortSignal): DataSourceReadNext<TItem> {
    const guard = (
      read: DataSourceReadNext<TItem>,
    ): DataSourceReadNext<TItem> => {
      return async (payload) => {
        if (signal.aborted) throw new AbortedException();
        const items = await read(payload);
        if (signal.aborted) throw new AbortedException();
        return items;
      };
    };
    const core = guard((payload) => this._reader(payload, signal));
    return this._extensions.reduceRight<DataSourceReadNext<TItem>>(
      (next, extension) => {
        const readItems = extension.readItems;
        if (!readItems) return next;
        return guard((payload) =>
          readItems.call(extension, payload, next, signal),
        );
      },
      core,
    );
  }
  /** Updates the flag and raises `isReading` only when the value changes. */
  private _setIsReading(isReading: boolean): void {
    if (this._isReading === isReading) return;
    this._isReading = isReading;
    this._eventBus.trigger("isReading", isReading);
  }
}
