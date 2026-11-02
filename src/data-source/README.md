# `data-source`

**An extensible, event-driven data source.** `DataSource` reads items through
a reader and lets its **extensions** shape the query
([`QueryItemsPayload`](../query-items)) and the result. The core knows nothing
about filters or pages: every behaviour is an extension, given by **key** and
exposed under that key, and the type of the source
(`IDataSource<TItem, TCaps>`) states which keys it guarantees. The pipeline
order is canonical: `filtering`, `sorting`, `pagination`, `projection`, then
the extensions without a key, then the augmented keys.

## What's in here

- **`interfaces.ts`** — `DataSourceCapabilities<TItem>`, the map from a key
  (`filtering`, `pagination`, `projection`, `sorting`) to the interface of the
  extension, open to augmentation by the consumer; `IDataSourceBase<TItem>`
  (`items`, `isReading`, `read()`, the deprecated `getExtension(constructor)`);
  `IDataSource<TItem, TCaps>`, a type alias adding the capabilities to the
  base: the keys in `TCaps` as required readonly properties, the other known
  keys as optional ones (`never` by default: nothing guaranteed); and
  `IDataSourceExtension<TItem, TEvents>`, the hooks of the read cycle, both
  optional and both given the `AbortSignal` of the read as optional last
  parameter:
  1. `getItemsBefore(payload, signal?)` of each extension builds the payload;
  2. the reader resolves it into the items, `reader(payload, signal)`;
  3. `getItemsAfter(items, payload, signal?)` of each extension may transform them.
- **`models.ts`** — `DataSource<TItem, TCaps>`: takes the extensions by key
  (`DataSourceExtensions`) plus optional `others`, builds the pipeline in the
  canonical order (`DataSourceCapabilitiesOrder`) and exposes every keyed
  extension as an own readonly property, set only when given (`"sorting" in
  source` tells); still accepts a plain list (deprecated, removed in 2.0),
  kept in its order with the keyed properties filled by `instanceof`. Runs
  the cycle in one `AbortableDelegate` of ts-core so that **the latest read
  wins**: a `read()` requested while another is running supersedes it (the
  superseded `read()` rejects with `AbortedException` at once, its signal is
  aborted, its cycle never touches the state); keeps `items` of the latest
  read, raises `isReading` on the transitions of the burst, `items` and
  `error` (then rethrows) for the latest read only; `dispose()` aborts the
  running read and disposes every extension, keyed or not.
- **`utils.ts`** — `createDataSource(reader, extensions, others?)`: the public
  way to build a source, inferring `TCaps` from the keys of the record whose
  value cannot be `undefined` (`DefinedCapabilities`).
- **`types.ts`** — `DataSourceCapability` (a key of the map),
  `DataSourceCapabilityProperty` (how the class types a keyed property from
  `TCaps`), `DataSourceEvents`, `DataSourceExtensions` (the record by key),
  `DefinedCapabilities`, `DataSourcePayload` (= `QueryItemsPayload`),
  `DataSourceReader<TItem, TResult>` (= `QueryItemsReader`).
- **`extension/`** — `DataSourceExtension`: optional base class of the package
  extensions, a `Subscribable` with a debounced `*Change` event
  (`options.changeDelay`, default `DataSourceExtensionChangeDelayDefault` = 100 ms)
  cancelled by `dispose()`; `DataSourceExtensionOptions`. Custom extensions
  only need `IDataSourceExtension`. It has its own folder so that `DataSource`
  can know the four classes of the package (for the list form) without a
  cycle between the base class and its subclasses.
- **`filtering/`** — `FilterExtension`: flat list of filters with one logic,
  sent as a `FiltersList` only when not empty; several filters per field
  allowed (`addFilter`, `removeFilter`, `removeFiltersOf`, `replaceFiltersOf`,
  `setFilters`, `clearFilters`, `setLogic`); events per mutation plus the
  debounced `filtersChange`. `FilterExtensionWithFixedFilters`: always sends a
  fixed expression, grouped with the user filters through `groupsLogic`. Both
  are the `filtering` capability.
- **`pagination/`** — `PaginationExtension(countReader, itemsPerPage,
  itemsPerPageOptions?, options?)`: reads the total count on every read,
  forwarding the signal of the read to `countReader`, then adds `paging`. 1-based pages clamped to `[1, lastPage]` (`goToPage`,
  `goToFirstPage`, `goToLastPage`, `goToNextPage`, `goToPreviousPage`,
  `canGoNextPage`, `canGoPreviousPage`), `setItemsPerPage` validated against
  the options, events (`page`, `itemsPerPage`, `totalItemsCount`) only on an
  actual change. With `resetPageOnQueryChange` (default `true`) it goes back
  to page 1 when the query built by the previous extensions changes between
  two reads, compared by hash. The `pagination` capability.
- **`sorting/`** — `SortExtension(sortsLimit = 0, options?)`: list of sorts by
  priority, `0` = unlimited, `addSort` replaces the sort on the same field;
  `SingleSortExtension`: one sort at most, `addSort` replaces it whatever the
  field. Events per mutation plus the debounced `sortsChange`. Both are the
  `sorting` capability.
- **`projection/`** — `ProjectionExtension`: list of fields to return
  (`addProjection` ignores a duplicated field). Events per mutation plus the
  debounced `projectionsChange`. The `projection` capability.

Each extension folder has `interfaces.ts` (`I*Extension`), `models.ts` (the
class) and `types.ts` (its `*Events` and options).
