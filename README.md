# TypeScript Data (@mantlebee/ts-data)

> Models and utilities to query and navigate data (filtering, sorting, pagination, projection) through an extensible, event-driven data source.

## Installation

```bash
npm install @mantlebee/ts-data @mantlebee/ts-core
```

`@mantlebee/ts-core` (`^1.1.0`) is a peer dependency: it must be installed alongside this package.

## Structure

- `src/query-items`: plain types that describe a query (`QueryItemsPayload`, `Filter`, `FiltersExpression`, `FilterLogics`, `FilterOperators`, `Sort`, `Paging`, `Projection`), the `FilterRange` / `FilterRangeLimit` helpers and the `addSort` / `removeSort` utils.
- `src/data-source`: `DataSource`, which reads items through a `DataSourceReader` and builds the payload by running the extensions in array order (hooks `getItemsBefore`, `getItemsAfter`), plus the extensions `FilterExtension`, `FilterExtensionWithFixedFilters`, `PaginationExtension`, `ProjectionExtension`, `SortExtension` and `SingleSortExtension`, and the `resetPageOnFiltersChange` helper. Every extension and the data source extend ts-core's `Subscribable`, so consumers listen with `.on(eventName, handler)`.

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

// The extensions run in array order to build the payload passed to the reader:
// put the filtering before the pagination, so the count reader receives the filters.
const dataSource = new DataSource<Item>(reader, [filtering, sorting, paginating]);

dataSource.on("items", (items) => console.log(items));

filtering.addFilter({ field: "name", operator: FilterOperators.contains, value: "a" });
await dataSource.read();
```

The order of the extensions is up to you: the data source knows nothing about them, it just invokes their hooks in sequence.

## Status

Version 1.0.0 is in progress on the `v1` branch. The API may still change until it is released.

## License

MIT
