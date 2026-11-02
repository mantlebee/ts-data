# `data-source`

**An extensible, event-driven data source.** A data source reads items through
a reader and lets its **extensions** shape the query
([`QueryItemsPayload`](../query-items)) and the result. The core knows nothing
about filters or pages: every behaviour is an extension, given by **key** and
exposed under that key, and the type of the source
(`IDataSource<TItem, TExt>`) carries the record of its extensions. The
extensions run in the order of the keys of the record, the order the consumer
writes them in (filtering before pagination, so the count receives the
filters).

## What's in here

- **`interfaces.ts`** — `IDataSourceBase<TItem>` (`items`, `isReading`,
  `read()`) and `IDataSource<TItem, TExt>`, a type alias adding the keyed
  extensions to the base: the keys of the record whose value cannot be
  `undefined` as required readonly properties, the others as optional ones,
  nothing else (`TExt` defaults to an empty record, nothing guaranteed).
- **`models.ts`** — `DataSource<TItem>`, the class behind `createDataSource`,
  not exported: takes the extensions by key
  (`DataSourceExtensionsDefinition`), runs them in the order of the keys and
  exposes every extension as an own readonly property, set only when given
  (`"sorting" in source` tells; a key that is a member of the source is
  refused); as a class it types no key, hence the factory. Runs the cycle in one
  `AbortableDelegate` of ts-core so that **the latest read wins**: a `read()`
  requested while another is running supersedes it (the superseded `read()`
  rejects with `AbortedException` at once, its signal is aborted, its cycle
  never touches the state); keeps `items` of the latest read, raises
  `isReading` on the transitions of the burst, `items` and `error` (then
  rethrows) for the latest read only; `dispose()` aborts the running read and
  disposes every extension.
- **`utils.ts`** — `createDataSource(reader, extensions)`: the only way to build a
  source, returning the `IDataSource` typed with the record given, custom
  keys included.
- **`types.ts`** — `DataSourceEvents`, `DataSourcePayload`
  (= `QueryItemsPayload`), `DataSourceReader<TItem, TResult>`
  (= `QueryItemsReader`).
- **`extensions/`** — everything about the extensions as such:
  - `interfaces.ts`: `IDataSourceExtension<TItem, TEvents>`, the hooks of the
    read cycle, both optional and both given the `AbortSignal` of the read as
    optional last parameter:
    1. `getItemsBefore(payload, signal?)` of each extension builds the payload;
    2. the reader resolves it into the items, `reader(payload, signal)`;
    3. `getItemsAfter(items, payload, signal?)` of each extension may transform them.

    And `IDataSourceWith<TItem, TCapability>`, the shortcut a consumer states
    its needs with: `IDataSourceWith<User, "filtering" | "pagination">` is
    `IDataSource<User, { filtering: IFilterExtension<User>; pagination: IPaginationExtension<User> }>`.

  - `models.ts`: `DataSourceExtension`, optional base class of the package
    extensions, a `Subscribable` with a debounced `*Change` event
    (`options.changeDelay`, default `DataSourceExtensionChangeDelayDefault` =
    100 ms) cancelled by `dispose()`. Custom extensions only need
    `IDataSourceExtension`.
  - `types.ts`: `DataSourceCapabilities` (the four keys of the package with
    their interfaces, the convention behind `IDataSourceWith`) and
    `DataSourceCapability` (a key of it), `DataSourceExtensionsDefinition`
    (the shape of a record of extensions: any key, any extension of the item
    type), `DataSourceExtensionProperties` (the keyed properties a record
    gives), `DataSourceExtensionOptions`.
- **`filtering/`** — `FilterExtension`: flat list of filters with one logic,
  sent as a `FiltersList` only when not empty; several filters per field
  allowed (`addFilter`, `removeFilter`, `removeFiltersOf`, `replaceFiltersOf`,
  `setFilters`, `clearFilters`, `setLogic`); events per mutation plus the
  debounced `filtersChange`. `FilterExtensionWithFixedFilters`: always sends a
  fixed expression, grouped with the user filters through `groupsLogic`. Both
  go under the `filtering` key.
- **`pagination/`** — `PaginationExtension(countReader, itemsPerPage,
itemsPerPageOptions?, options?)`: reads the total count on every read,
  forwarding the signal of the read to `countReader`, then adds `pagination`.
  Write its key after the ones whose contribution the count must consider.
  1-based pages clamped to `[1, lastPage]` (`goToPage`, `goToFirstPage`,
  `goToLastPage`, `goToNextPage`, `goToPreviousPage`, `canGoNextPage`,
  `canGoPreviousPage`), `setItemsPerPage` validated against the options,
  events (`page`, `itemsPerPage`, `totalItemsCount`) only on an actual
  change. With `resetPageOnQueryChange` (default `true`) it goes back to page
  1 when the query built by the previous extensions changes between two
  reads, compared by hash. The `pagination` key.
- **`sorting/`** — `SortExtension(sortsLimit = 0, options?)`: list of sorts by
  priority, `0` = unlimited, `addSort` replaces the sort on the same field;
  `SingleSortExtension`: one sort at most, `addSort` replaces it whatever the
  field. Events per mutation plus the debounced `sortsChange`. Both go under
  the `sorting` key.
- **`projection/`** — `ProjectionExtension`: list of fields to return
  (`addProjection` ignores a duplicated field). Events per mutation plus the
  debounced `projectionsChange`. The `projection` key.

Each extension folder has `interfaces.ts` (`I*Extension`), `models.ts` (the
class) and `types.ts` (its `*Events` and options).
