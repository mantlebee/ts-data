# `data-source`

**An extensible, event-driven data source.** `DataSource` reads items through
a reader and lets its **extensions** shape the query
([`QueryItemsPayload`](../query-items)) and the result. The core knows nothing
about filters or pages: every behaviour is an extension, invoked in array
order, and the order is up to the consumer (filtering before pagination, so
the count receives the filters).

## What's in here

- **`interfaces.ts`** — `IDataSource<TItem>` (`items`, `isReading`, `read()`,
  `getExtension(constructor)`) and `IDataSourceExtension<TItem, TEvents>`, the
  hooks of the read cycle, both optional:
  1. `getItemsBefore(payload)` of each extension builds the payload;
  2. the reader resolves it into the items;
  3. `getItemsAfter(items, payload)` of each extension may transform them.
- **`models.ts`** — `DataSource`: runs the cycle, keeps `items`, raises
  `isReading`, `items` and `error` (then rethrows); `dispose()` disposes the
  extensions too. `DataSourceExtension`: optional base class of the package
  extensions, a `Subscribable` with a debounced `*Change` event
  (`options.changeDelay`, default `DataSourceExtensionChangeDelayDefault` = 100 ms)
  cancelled by `dispose()`. Custom extensions only need `IDataSourceExtension`.
- **`types.ts`** — `DataSourceEvents`, `DataSourceExtensionOptions`,
  `DataSourcePayload` (= `QueryItemsPayload`), `DataSourceReader<TItem, TResult>`
  (= `QueryItemsReader`).
- **`filtering/`** — `FilterExtension`: flat list of filters with one logic,
  sent as a `FiltersList` only when not empty; several filters per field
  allowed (`addFilter`, `removeFilter`, `removeFiltersOf`, `replaceFiltersOf`,
  `setFilters`, `clearFilters`, `setLogic`); events per mutation plus the
  debounced `filtersChange`. `FilterExtensionWithFixedFilters`: always sends a
  fixed expression, grouped with the user filters through `groupsLogic`.
- **`pagination/`** — `PaginationExtension(countReader, itemsPerPage,
  itemsPerPageOptions?, options?)`: reads the total count on every read, then
  adds `paging`. 1-based pages clamped to `[1, lastPage]` (`goToPage`,
  `goToFirstPage`, `goToLastPage`, `goToNextPage`, `goToPreviousPage`,
  `canGoNextPage`, `canGoPreviousPage`), `setItemsPerPage` validated against
  the options, events (`page`, `itemsPerPage`, `totalItemsCount`) only on an
  actual change. With `resetPageOnQueryChange` (default `true`) it goes back
  to page 1 when the query built by the previous extensions changes between
  two reads, compared by hash.
- **`sorting/`** — `SortExtension(sortsLimit = 0, options?)`: list of sorts by
  priority, `0` = unlimited, `addSort` replaces the sort on the same field;
  `SingleSortExtension`: one sort at most, `addSort` replaces it whatever the
  field. Events per mutation plus the debounced `sortsChange`.
- **`projection/`** — `ProjectionExtension`: list of fields to return
  (`addProjection` ignores a duplicated field). Events per mutation plus the
  debounced `projectionsChange`.

Each extension folder has `interfaces.ts` (`I*Extension`), `models.ts` (the
class) and `types.ts` (its `*Events` and options).
