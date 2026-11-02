# `data-source`

**An extensible, event-driven data source.** `DataSource` reads items through
a reader and lets its **extensions** shape the query
([`QueryItemsPayload`](../query-items)) and the result. The core knows nothing
about filters or pages: every behaviour is an extension, given by **key** and
exposed under that key, and the type of the source
(`IDataSource<TItem, TExt>`) carries the record of its extensions. The
pipeline order is canonical: `filtering`, `sorting`, `pagination`,
`projection`, then the custom keys in insertion order.

## What's in here

- **`interfaces.ts`** — `IDataSourceBase<TItem>` (`items`, `isReading`,
  `read()`); `IDataSource<TItem, TExt>`, a type alias adding the keyed
  extensions to the base: the keys of the record whose value cannot be
  `undefined` as required readonly properties, the others and the keys of the
  package not in the record as optional ones (`TExt` defaults to an empty
  record, nothing guaranteed; a union of keys of the package is a shorthand
  for the record of their interfaces); and
  `IDataSourceExtension<TItem, TEvents>`, the hooks of the read cycle, both
  optional and both given the `AbortSignal` of the read as optional last
  parameter:
  1. `getItemsBefore(payload, signal?)` of each extension builds the payload;
  2. the reader resolves it into the items, `reader(payload, signal)`;
  3. `getItemsAfter(items, payload, signal?)` of each extension may transform them.
- **`models.ts`** — `DataSource<TItem>`: takes the extensions by key
  (`DataSourceExtensionsDefinition`), builds the pipeline in the canonical
  order (`DataSourceCapabilitiesOrder`) and exposes every extension as an own
  readonly property, set only when given (`"sorting" in source` tells); as a
  class it types the four keys of the package only, as optional properties.
  Runs the cycle in one `AbortableDelegate` of ts-core so that **the latest
  read wins**: a `read()` requested while another is running supersedes it
  (the superseded `read()` rejects with `AbortedException` at once, its
  signal is aborted, its cycle never touches the state); keeps `items` of the
  latest read, raises `isReading` on the transitions of the burst, `items`
  and `error` (then rethrows) for the latest read only; `dispose()` aborts
  the running read and disposes every extension. `DataSourceExtension`:
  optional base class of the package extensions, a `Subscribable` with a
  debounced `*Change` event (`options.changeDelay`, default
  `DataSourceExtensionChangeDelayDefault` = 100 ms) cancelled by `dispose()`.
  Custom extensions only need `IDataSourceExtension`.
- **`utils.ts`** — `createDataSource(reader, extensions)`: the way to build a
  source, returning the `IDataSource` typed with the record given, custom
  keys included.
- **`types.ts`** — `DataSourceCapabilities` (the four keys of the package
  with their interfaces) and `DataSourceCapability` (a key of it),
  `DataSourceExtensionsDefinition` (the shape of a record of extensions),
  `DataSourceExtensionProperties` (the keyed properties a record gives),
  `DataSourceExtensionsOf` (the shorthand resolution), `DataSourceEvents`,
  `DataSourceExtensionOptions`, `DataSourcePayload` (= `QueryItemsPayload`),
  `DataSourceReader<TItem, TResult>` (= `QueryItemsReader`).
- **`filtering/`** — `FilterExtension`: flat list of filters with one logic,
  sent as a `FiltersList` only when not empty; several filters per field
  allowed (`addFilter`, `removeFilter`, `removeFiltersOf`, `replaceFiltersOf`,
  `setFilters`, `clearFilters`, `setLogic`); events per mutation plus the
  debounced `filtersChange`. `FilterExtensionWithFixedFilters`: always sends a
  fixed expression, grouped with the user filters through `groupsLogic`. Both
  go under the `filtering` key.
- **`pagination/`** — `PaginationExtension(countReader, itemsPerPage,
itemsPerPageOptions?, options?)`: reads the total count on every read,
  forwarding the signal of the read to `countReader`, then adds `paging`. 1-based pages clamped to `[1, lastPage]` (`goToPage`,
  `goToFirstPage`, `goToLastPage`, `goToNextPage`, `goToPreviousPage`,
  `canGoNextPage`, `canGoPreviousPage`), `setItemsPerPage` validated against
  the options, events (`page`, `itemsPerPage`, `totalItemsCount`) only on an
  actual change. With `resetPageOnQueryChange` (default `true`) it goes back
  to page 1 when the query built by the previous extensions (the filters and
  the sorts) changes between two reads, compared by hash. The `pagination`
  key.
- **`sorting/`** — `SortExtension(sortsLimit = 0, options?)`: list of sorts by
  priority, `0` = unlimited, `addSort` replaces the sort on the same field;
  `SingleSortExtension`: one sort at most, `addSort` replaces it whatever the
  field. Events per mutation plus the debounced `sortsChange`. Both go under
  the `sorting` key.
- **`projection/`** — `ProjectionExtension`: list of fields to return
  (`addProjection` ignores a duplicated field). Events per mutation plus the
  debounced `projectionsChange`. The `projection` key, run after the
  pagination: the projections are not part of the count nor of the page
  reset.

Each extension folder has `interfaces.ts` (`I*Extension`), `models.ts` (the
class) and `types.ts` (its `*Events` and options).
