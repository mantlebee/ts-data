# TypeScript Data (@mantlebee/ts-data)

> Models and utilities to query and navigate data (filtering, sorting, pagination, projection) through an extensible, event-driven data source.

## Installation

```bash
npm install @mantlebee/ts-data @mantlebee/ts-core
```

`@mantlebee/ts-core` (`^1.1.0`) is a peer dependency: it must be installed alongside this package.

## Structure

- `src/query-items`: plain types that describe a query (`QueryItemsPayload`, `Filter`, `FiltersExpression`, `FilterLogics`, `FilterOperators`, `Sort`, `Paging`, `Projection`), the `FilterRange` / `FilterRangeLimit` helpers and the `addSort` / `removeSort` utils.
- `src/data-source`: `DataSourceBase` / `DataSource`, which read items through a `DataSourceReader` and build the payload by running the extensions in order (hooks `getItemsBefore`, `getItemsAfter`, `onReadError`), plus the extensions `FilterExtension`, `FilterExtensionWithFixedFilters`, `PaginationExtension`, `ProjectionExtension`, `SortExtension` and `SingleSortExtension`, and the `resetPageOnFiltersChange` helper. Every extension and the data source extend ts-core's `Subscribable`, so consumers listen with `.on(eventName, handler)`.

## Quick start

```typescript
import {
  DataSource,
  FilterExtension,
  FilterOperators,
  PaginationExtension,
  QueryItemsPayload,
  SortExtension,
} from "@mantlebee/ts-data";

type Item = { id: number; name: string };

// Talks to your backend (or any other source): receives the query, returns the items.
const reader = async (payload: QueryItemsPayload<Item>): Promise<Item[]> => {
  return fetchItems(payload); // your implementation
};
// Receives the query (filters included) and returns the total number of matching items.
const countReader = async (payload: QueryItemsPayload<Item>): Promise<number> => {
  return fetchItemsCount(payload); // your implementation
};

const filtering = new FilterExtension<Item>();
const paginating = new PaginationExtension<Item>(countReader, 10);
const sorting = new SortExtension<Item>();

// Named extensions run in a fixed order (filtering, sorting, projecting,
// paginating) to build the payload passed to the reader.
const dataSource = new DataSource<Item>(reader, { filtering, paginating, sorting });

dataSource.on("items", (items) => console.log(items));

filtering.addFilter({ field: "name", operator: FilterOperators.contains, value: "a" });
await dataSource.read();
```

`DataSource` runs the filtering before the pagination, so the count reader receives the filters. Use `DataSourceBase(reader, extensions[])` when you need a custom order or only custom extensions.

## Status

Version 1.0.0 is in progress on the `v1` branch. The API may still change until it is released.

## License

MIT
