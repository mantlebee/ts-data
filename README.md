# TypeScript Data (@mantlebee/ts-data)

> Models and utilities to query and navigate data (filtering, sorting, pagination, projection) through an extensible, event-driven data source.

A small library that separates **what** a query asks for from **how** it is
run: the `QueryItemsPayload` describes filters, sorts, pagination and projections
in a storage-agnostic way, and a data source builds it through a chain of
**extensions** before handing it to your reader (an HTTP call, a SQL query, an
in-memory filter, …). Every piece raises typed events, so a UI can react to
each change without polling.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Upgrading to 1.0](#upgrading-to-10)
- [Upgrading to 1.2](#upgrading-to-12)
- [Upgrading to 2.0](#upgrading-to-20)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [The payload](#the-payload)
  - [The data source and its extensions](#the-data-source-and-its-extensions)
  - [Capabilities](#capabilities)
  - [Events](#events)
  - [Filters, sorts, pagination and projections](#filters-sorts-pagination-and-projections)
  - [Range filters from the UI](#range-filters-from-the-ui)
  - [In-memory data](#in-memory-data)
  - [Writing an extension](#writing-an-extension)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

## Features

- 🧩 **Extensible data source**: the core only runs a read cycle; filtering, pagination, sorting and projection are extensions you give it by key, and you can write your own, up to wrapping the reading itself (a cache, a batching), up to wrapping the reading itself (a cache, a batching), up to wrapping the reading itself (a cache, a batching)
- 🧾 **Extensions in the type**: `createDataSource(reader, { filtering, pagination, distinct })` returns an `IDataSource` whose type carries every extension by key, custom ones included, so a consumer declares what it needs in a signature (`source: IDataSourceWith<User, "filtering" | "pagination">`) and the compiler checks it, no `instanceof` probing
- 🏁 **The latest read wins**: a `read()` requested while another is running supersedes it, `items` always come from the latest read, `isReading` follows it, and the readers receive an `AbortSignal` to hand to `fetch`
- 📄 **Storage-agnostic query model**: `QueryItemsPayload` with typed `Filter`s (OData-like operators), `Sort`s, `Pagination` and `Projection`s, translated by your reader
- 🔔 **Typed events**: every mutation raises its own event, plus a debounced `*Change` event per extension, on top of `Subscribable` of [`@mantlebee/ts-core`](https://github.com/mantlebee/ts-core)
- 📑 **Complete pagination**: 1-based pages, clamped navigation, total count kept up to date, automatic return to page 1 when the query changes
- 🎚️ **Range helpers**: `FilterRange` / `FilterRangeLimit` to bind an interval UI control to a filter
- 🧠 **In-memory reader**: `createInMemoryQueryItemsReader` resolves filters, sorts and pagination over a plain array exactly as a server would, so the same grid runs on local data, fixtures and stories
- 🌳 **Tree-shakable**: ES modules next to the CommonJS bundle, no side effects, no runtime dependency besides the peer

## Installation

```bash
npm install @mantlebee/ts-data @mantlebee/ts-core
```

`@mantlebee/ts-core` (`^1.3.0`, the version that ships `AbortableDelegate`) is a
**peer dependency**: install it alongside this package. It works in the browser and in Node alike. TypeScript projects need `strict` or at least
`strictNullChecks` for the discriminated `Filter` type to work as intended.

## Upgrading to 1.0

Version 1.0.0 replaces the whole 0.1.0 API (`browsing`, `querying`) and
supersedes the copy of this code living in `bl-core`. See the
[1.0.0 release notes](https://github.com/mantlebee/ts-data/blob/main/docs/release-notes/1.0.0.md)
for the two migration guides and the checklist.

## Upgrading to 1.2

Version 1.2.0 makes the latest read win: a `read()` requested while another
is running supersedes it, and the superseded `read()` **rejects with
`AbortedException`** of ts-core. A consumer awaiting `read()` ignores that
rejection with `isAbortedException`; one that only listens to `items` and
`error` has nothing to change. It needs `@mantlebee/ts-core` 1.3.0. See the
[1.2.0 release notes](https://github.com/mantlebee/ts-data/blob/main/docs/release-notes/1.2.0.md).

## Upgrading to 2.0

Version 2.0.0 makes the extensions of a source part of its type
([Capabilities](#capabilities)) and **breaks** the way a source is built,
inspected and extended:

- the extensions are given **by key** (`createDataSource(reader,
{ filtering, pagination })`) instead of as an ordered list, still in the
  order you write them, and read from the keyed properties
  (`source.filtering`, `source.pagination`, …); `getExtension(Class)` is gone;
- the `DataSource` class is no longer exported: `createDataSource` is the only
  way to build a source, and a source of your own implements `IDataSource`;
- the hooks of an extension are `buildPayload(payload, signal?)` (was
  `getItemsBefore`) and `readItems(payload, next, signal?)`, which wraps the
  reading and replaces `getItemsAfter`: transform the result of
  `next(payload)`, knowing that the first key now transforms last (see
  [Writing an extension](#writing-an-extension));
- `Paging` is `Pagination`, `payload.paging` is `payload.pagination`.

See the
[2.0.0 release notes](https://github.com/mantlebee/ts-data/blob/main/docs/release-notes/2.0.0.md)
for the migration.

## Quick Start

```typescript
import {
  createDataSource,
  FilterExtension,
  FilterOperators,
  PaginationExtension,
  QueryItemsPayload,
  SortExtension,
} from "@mantlebee/ts-data";

type User = { id: number; name: string; age: number };

// Your readers: translate the payload into a request and return the result.
// The signal is aborted when a newer read supersedes this one: hand it to
// your HTTP client to cancel the request, or ignore it.
const readUsers = (
  payload: QueryItemsPayload<User>,
  signal?: AbortSignal,
): Promise<User[]> =>
  api.get("/users", { params: toQueryString(payload), signal });
const countUsers = (
  payload: QueryItemsPayload<User>,
  signal?: AbortSignal,
): Promise<number> =>
  api.get("/users/count", { params: toQueryString(payload), signal });

// Write the item type on every extension: it cannot be inferred later.
const filtering = new FilterExtension<User>();
const sorting = new SortExtension<User>();
const pagination = new PaginationExtension<User>(countUsers, 20, [10, 20, 50]);

// The extensions are given by key and run in the order of the keys: filtering
// and sorting before pagination, so the count receives the filters and the sorts.
// The type carries them: IDataSource<User, { filtering: FilterExtension<User>;
// sorting: SortExtension<User>; pagination: PaginationExtension<User> }>.
const users = createDataSource(readUsers, { filtering, sorting, pagination });

users.on("items", (items) => render(items));
users.on("isReading", (isReading) => spinner.toggle(isReading));
users.on("error", (error) => toast.error(String(error)));

// Read again once the user stops changing filters, sorts or page.
users.filtering.on("filtersChange", () => users.read());
users.sorting.on("sortsChange", () => users.read());
users.pagination.on("page", () => users.read());

users.filtering.addFilter({
  field: "name",
  operator: FilterOperators.contains,
  value: "ann",
});
users.filtering.addFilter({
  field: "age",
  operator: FilterOperators.greaterThanOrEqual,
  value: 18,
});
users.sorting.addSort({ field: "name", asc: true });
await users.read();
// countUsers({ filters, sorts }) → readUsers({ filters, sorts, pagination: { page: 1, itemsPerPage: 20, totalItemsCount } })

users.pagination.goToNextPage(); // `page` event → read()
```

## Core Concepts

### The payload

`QueryItemsPayload<TItem>` is a plain object with optional properties, each
one set only by who needs it:

```typescript
type QueryItemsPayload<TItem> = {
  distinct?: boolean; // drop duplicated items
  filters?: FiltersExpression<TItem>; // conditions
  pagination?: Pagination; // { page, itemsPerPage, totalItemsCount }, 1-based
  projections?: List<Projection<TItem>>; // fields to return, empty = every field
  sorts?: List<Sort<TItem>>; // by priority, the first wins
};
```

The package never runs a query: your **reader** does, by translating the
payload into whatever your storage understands. The reader of the items
returns `Promise<TItem[]>`, the count reader of the pagination returns
`Promise<number>`; both receive the same payload and, as optional second
argument, the `AbortSignal` of the read.

### The data source and its extensions

A data source, built with `createDataSource(reader, extensions)`, holds the
items of the latest read and the `isReading` flag, and runs the **read
cycle** on `read()`:

1. **build**: `buildPayload(payload, signal)` of each extension, in the order of the keys, adds its contribution to the payload; the phase completes before any item is read;
2. **read**: `readItems(payload, next, signal)` of each extension wraps the reading, like a middleware: the extensions with the hook form an onion around the reader, `reader(payload, signal)`, the first key outermost, and `next(payload)` hands the payload to the layers inside. The result flows outward, so the outermost extension transforms last.

The data source knows nothing about filters or pages, not even the names of
the keys: the extensions run **in the order of the keys of the record**, the
order you write them in, and that order is yours to choose and it matters.
Write `filtering` (and `sorting`) before `pagination`, because the pagination
reads the total count with the payload it receives, and watches that payload
for the page reset. A failure anywhere (reader or hook) raises the `error`
event, rejects `read()` with the same error and, when no newer read is
running, resets `isReading`.

**The latest read wins.** A `read()` requested while another is running
supersedes it (the cycle runs in the `AbortableDelegate` of ts-core): the
superseded `read()` rejects with `AbortedException` at once, its `signal` is
aborted, and its cycle stops at the next `await` without touching `items`
nor raising `items` or `error`, whatever its reader returns later. `items`
and the `items` event therefore always come from the latest read, and
`isReading` is `true` from the first `read()` of a burst until the latest one
settles (the `isReading` event is raised only on these two transitions).
`dispose()` aborts the running read the same way. A consumer awaiting
`read()` ignores the supersession with `isAbortedException`:

```typescript
import { isAbortedException } from "@mantlebee/ts-core";

try {
  await users.read();
} catch (error) {
  if (!isAbortedException(error)) throw error; // a newer read superseded this one
}
```

The `signal` given to the reader and to the hooks is aborted exactly when the
read is superseded (or the source disposed): hand it to `fetch` to cancel the
request, or ignore it, the result of a superseded read is discarded anyway.

| Extension                         | Adds to the payload                                                               | Highlights                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `FilterExtension`                 | `filters` (a `FiltersList`), only when not empty                                  | flat list with one logic (`and`/`or`); several filters per field allowed; `replaceFiltersOf(field, …)` |
| `FilterExtensionWithFixedFilters` | `filters`: the fixed expression, grouped with the user filters when there are any | e.g. "only active users" whatever the user chooses                                                     |
| `PaginationExtension`             | `pagination`, after reading the total count                                       | `goTo*Page()` clamped to `[1, lastPage]`, `itemsPerPageOptions`, `resetPageOnQueryChange`              |
| `SortExtension`                   | `sorts` (always, `[]` = no sort)                                                  | optional `sortsLimit` (`0` = unlimited); `addSort` replaces the sort on the same field                 |
| `SingleSortExtension`             | `sorts` with one sort at most                                                     | `addSort` replaces the current sort, whatever its field                                                |
| `ProjectionExtension`             | `projections` (always, `[]` = every field)                                        | `addProjection` ignores a duplicated field                                                             |

Read the extensions from the source by key (`users.filtering`,
`users.pagination`, …): they are part of its type, see
[Capabilities](#capabilities). The keys above are a convention of the
package (`DataSourceCapabilities`), not a rule: any key may hold any
extension.

Write the item type on the extension (`new FilterExtension<User>()`):
TypeScript cannot infer it from the data source the extension is later passed
to, and the generic defaults to `Any`, so a missing type argument compiles but
loses the field suggestions and checks.

### Capabilities

The second type argument of `IDataSource<TItem, TExt>` is the **record of the
extensions of the source, by key**, the way the events of a `Subscribable` of
ts-core are a record: `createDataSource` infers it from the record it is
given, custom keys included, and nothing has to be registered anywhere.

```typescript
const users = createDataSource(readUsers, { filtering, pagination, distinct });
// IDataSource<User, {
//   filtering: FilterExtension<User>;
//   pagination: PaginationExtension<User>;
//   distinct: DistinctExtension<User>;
// }>
users.filtering.addFilter(adult); // required: the key is in the record
users.distinct; // DistinctExtension<User>: a custom key, typed
users.sorting; // compile error: not in the record, not a property
```

The rules of the type:

- a key whose value cannot be `undefined` is a **required** readonly property;
- a key whose value may be `undefined` (`sorting: maybeSorting`, or `sorting?:`
  in a type you write) is an **optional** one: the extension is exposed when
  given, but the type does not guarantee it;
- a key not in the record is not a property at all, whether it is a key of
  the package or your own: the data source knows no key.

A consumer declares what it needs in its signature. `IDataSourceWith<TItem,
TCapability>` is the shortcut for the extensions of the package: the keys of
`DataSourceCapabilities` (`filtering`, `pagination`, `projection`, `sorting`)
resolved to their interfaces. A record states custom keys and optional ones,
and the two compose by intersection:

```typescript
// Shortcut: IDataSource<User, { filtering: IFilterExtension<User>; pagination: IPaginationExtension<User> }>
function useTable(source: IDataSourceWith<User, "filtering" | "pagination">) {
  source.filtering.addFilter(adult); // required: no check needed
  source.pagination.goToNextPage();
}

// A record: a custom key, required, and one that may be missing.
type UsersSource = IDataSourceWith<User, "filtering"> &
  IDataSource<
    User,
    { distinct: DistinctExtension<User>; audit?: AuditExtension<User> }
  >;
```

Assignability is structural: a source with more extensions fits a parameter
asking for fewer (`IDataSourceWith<User, "filtering" | "pagination">` →
`IDataSourceWith<User, "filtering">` → `IDataSource<User>`), never the
opposite. The default, an empty record, guarantees nothing: a plain
`IDataSource<User>` accepts every source and exposes no extension.

```typescript
useTable(users); // ok: more extensions than asked
useTable(createDataSource(readUsers, { filtering })); // compile error: no `pagination`

const maybeSorting: SortExtension<User> | undefined = sortable
  ? new SortExtension<User>()
  : undefined;
const products = createDataSource(readProducts, {
  filtering,
  sorting: maybeSorting,
});
products.sorting; // SortExtension<User> | undefined
```

The record is checked against the extension contract: every value must be an
`IDataSourceExtension` of the item type. The keys are not: `{ filtering:
sorting }` compiles, and fails only where a consumer asks for
`IDataSourceWith<User, "filtering">`. Write the shape of a record as a type
literal, as above: an interface has no implicit index signature and does not
satisfy the constraint.

A key set to `undefined` or not given is absent at runtime too: `"sorting" in
source` is `false`, and `source.sorting` is `undefined`. The extensions run in
the **order of the keys of the record**, custom or not (`{ distinct,
filtering, audit }` runs `distinct`, then `filtering`, then `audit`); a key
that is already a member of the source (`items`, `read`, …) is refused. The
class behind the sources is not exported: a class cannot type its members
from a generic record, so `createDataSource` is the only way to build one.

### Events

Every class extends `Subscribable` of ts-core: `on(event, handler)` returns an
`EventSubscription`, `dispose()` it to stop listening, and `dispose()` the
object itself to remove every handler (a data source disposes its extensions
too; every `dispose()` returns a promise).

Each mutation raises its own event **synchronously** with the new state
(`addFilter`, `removeSort`, `page`, …). The extensions that hold a list also
raise a **debounced** `*Change` event (`filtersChange`, `sortsChange`,
`projectionsChange`) once the mutations stop for `changeDelay` milliseconds
(100 by default, set it with the `options` argument of the constructor): the
right place to trigger a new read. `PaginationExtension` raises `page`,
`itemsPerPage` and `totalItemsCount` only when the value actually changes.

```typescript
const subscription = filtering.on("addFilter", (filter, filters) =>
  console.log(filter, filters),
);
await subscription.dispose(); // stop listening
await users.dispose(); // removes every handler of the data source and of its extensions
```

### Filters, sorts, pagination and projections

A `Filter` is `{ field, operator, value }`, where `field` is a key of the item
and `operator` is a member of `FilterOperators` (values follow OData 4 where it
defines them: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `contains`, `in`, …). The
type of `value` follows the operator:

```typescript
const adult: Filter<User> = {
  field: "age",
  operator: FilterOperators.greaterThanOrEqual,
  value: 18,
};
const roles: Filter<User> = {
  field: "role",
  operator: FilterOperators.in,
  value: ["admin", "editor"],
};
const price: Filter<Item> = {
  field: "price",
  operator: FilterOperators.range,
  value: {
    min: { value: 10, exclude: false },
    max: { value: 20, exclude: true },
  }, // 10 <= price < 20
};
```

A `FiltersExpression` is a tree whose node is either a `FiltersList`
(`{ logic, filters }`) or a `FiltersGroup` (`{ logic, groups }`), never both;
`isFiltersList` / `isFiltersGroup` tell them apart when a reader walks it:

```typescript
function toQuery<TItem>(expression: FiltersExpression<TItem>): string {
  if (isFiltersGroup(expression))
    return (
      "(" + expression.groups.map(toQuery).join(` ${expression.logic} `) + ")"
    );
  return expression.filters.map(toCondition).join(` ${expression.logic} `);
}
```

`Sort` is `{ field, asc }`, `Projection` is `{ field }`, `Pagination` is
`{ page, itemsPerPage, totalItemsCount }` with 1-based pages: the items to
skip are `(page - 1) * itemsPerPage`.

`PaginationExtension` goes back to page 1 whenever the query built by the
previous extensions differs from the one of the previous read (compared by
hash, so the first read never resets and a filter removed and re-added is not
a change). Tune it with `resetPageOnQueryChange`: `true` (default, every
property but `pagination`), `false`, or a list of payload properties such as
`["filters"]`:

```typescript
new PaginationExtension<User>(countUsers, 20, undefined, {
  resetPageOnQueryChange: ["filters"],
});
```

### Range filters from the UI

`FilterRange<TValue>` is an editable interval made of two `FilterRangeLimit`s
(`min`, `max`), each with a value (`null` = unbounded) and an `exclude` flag.
Bind your controls to the limits and the range to a filter:

```typescript
const price = new FilterRange<number>();

price.on("change", (range) =>
  price.isValid
    ? filtering.replaceFiltersOf("price", {
        field: "price",
        operator: FilterOperators.range,
        value: range,
      })
    : filtering.removeFiltersOf("price"),
);

minInput.addEventListener("input", () =>
  price.min.setValue(minInput.valueAsNumber || null),
);
maxInput.addEventListener("input", () =>
  price.max.setValue(maxInput.valueAsNumber || null),
);
strictCheckbox.addEventListener("change", () => price.max.toggleExclude());
```

`isClosed` tells whether both limits are set, `limitsMatch` whether the range
collapses to an "equal", `clear()` unsets both.

### In-memory data

`createInMemoryQueryItemsReader(getItems, options?)` returns the two readers of a data
source over a plain array, so the extensions work on local data (fixtures,
stories, small lists) without a second "client mode":

```typescript
import {
  createDataSource,
  createInMemoryQueryItemsReader,
  FilterExtension,
  FilterOperators,
  PaginationExtension,
  SortExtension,
} from "@mantlebee/ts-data";

const users: User[] = [
  { id: 1, name: "Ann", age: 31 },
  { id: 2, name: "Bob", age: 17 } /* ... */,
];
const { countReader, reader } = createInMemoryQueryItemsReader(() => users);
const dataSource = createDataSource(reader, {
  filtering: new FilterExtension<User>(),
  sorting: new SortExtension<User>(),
  pagination: new PaginationExtension<User>(countReader, 20),
});
dataSource.filtering.addFilter({
  field: "age",
  operator: FilterOperators.greaterThanOrEqual,
  value: 18,
});
dataSource.sorting.addSort({ field: "name", asc: true });
await dataSource.read(); // dataSource.items: the adults, by name, first page of 20
```

`reader` applies the filters, then the sorts, then the projections (and
`distinct`), then the page; `countReader` counts the items matching the
filters. Both resolve on the next microtask, so `isReading` is observable,
and both call the getter on every read: return another list to swap the
data between two reads. The list and its items are never mutated. The same
logic is available synchronously as `queryItems(items, payload, options?)`
and `countItems(items, payload, options?)`, and every step on its own:
`filterItems`, `sortItems`, `projectItems`, `distinctItems`, `pageItems`,
each exported by the `in-memory` folder of its feature.

Values are compared through `toComparableValue`: numbers and booleans as they
are, strings lower-cased (`options.caseSensitive: true` to keep the case;
`equalInsensitive` always ignores it), `Date`s by `getTime()`, any other
object by its `valueOf()` when that returns a primitive (so your value objects
plug in), by reference otherwise. `null` and `undefined` are the same "unset"
value: it matches `equal null` / `in [null]`, never an ordered or string
operator, and sorts first ascending. Override the rule per field with
`options.toComparable(value, field)`, which receives both sides of every
comparison. `contains` / `notContains` work on strings (substring) and on
lists (membership); every `FiltersExpression` tree is honoured at any depth;
a page beyond the last one is empty.

### Writing an extension

An extension is any `ISubscribable` implementing the optional hooks of
`IDataSourceExtension`: `buildPayload(payload, signal?)` adds to the query,
`readItems(payload, next, signal?)` wraps the reading. `DataSourceExtension`
is the base class used by the package (debounced `*Change` event); your own
extension does not need it. Both hooks receive the `AbortSignal` of the read
as optional last parameter: declare it only if the extension reads something
of its own and can hand it over, as `PaginationExtension` does with its count
reader. `next` has the signal bound already, nothing to forward.

```typescript
import { EventsDefinition, Subscribable } from "@mantlebee/ts-core";
import {
  DataSourcePayload,
  DataSourceReadNext,
  IDataSourceExtension,
} from "@mantlebee/ts-data";

/** Asks for distinct items and drops the duplicates the storage let through. */
class DistinctExtension<TItem>
  extends Subscribable<EventsDefinition>
  implements IDataSourceExtension<TItem>
{
  public async buildPayload(
    payload: DataSourcePayload<TItem>,
  ): Promise<DataSourcePayload<TItem>> {
    payload.distinct = true;
    return payload;
  }
  public async readItems(
    payload: DataSourcePayload<TItem>,
    next: DataSourceReadNext<TItem>,
  ): Promise<TItem[]> {
    return Array.from(new Set(await next(payload)));
  }
}

// A key of your own: the keys run in this order, filtering, distinct, then pagination.
const users = createDataSource(readUsers, {
  filtering,
  distinct: new DistinctExtension<User>(),
  pagination,
});
users.distinct; // DistinctExtension<User>
```

Anything written before `pagination` is part of the query it counts and of
the hash it watches for the page reset: here `distinct` is.

`readItems` sees the **whole payload**, whatever the position of its key: the
build phase completes before any reading. It decides what reading means:

- call `next` **zero** times: a cache hit returns its items and the reader is
  never invoked;
- call it **once**, with the payload given or another one;
- call it **N** times, e.g. for a backend taking one sort per call: one read
  per sort, results merged. Every call runs the inner layers and the reader
  again, so their hooks and events fire as many times;
- transform the result before returning it: the result flows outward, so the
  **outermost extension transforms last**, as in every middleware.

```typescript
/** A read-through cache: a hit skips `next`, hence the reader. */
class CacheExtension<TItem>
  extends Subscribable<EventsDefinition>
  implements IDataSourceExtension<TItem>
{
  private readonly _cache = new Map<string, TItem[]>();
  public async readItems(
    payload: DataSourcePayload<TItem>,
    next: DataSourceReadNext<TItem>,
  ): Promise<TItem[]> {
    const key = createHash(payload);
    const hit = this._cache.get(key);
    if (hit) return hit;
    const items = await next(payload);
    this._cache.set(key, items);
    return items;
  }
}
```

The latest read still wins inside the chain: every layer, the reader
included, rejects with the `AbortedException` of ts-core once the read is
superseded, so a `next` called or pending after that rejects, and a result
returned in silence never reaches the outer layers nor the source. Two
things such extensions cannot do, by design: a cache does not intercept the
count of the pagination, which runs in the build phase with a reader of its
own (decorate the count reader instead); and a batching does not compose with
the pagination for free, since merging N results already paginated does not
give the right page.

`readItems` sees the **whole payload**, whatever the position of its key: the
build phase completes before any reading. It decides what reading means:

- call `next` **zero** times: a cache hit returns its items and the reader is
  never invoked;
- call it **once**, with the payload given or another one;
- call it **N** times, e.g. for a backend taking one sort per call: one read
  per sort, results merged. Every call runs the inner layers and the reader
  again, so their hooks and events fire as many times;
- transform the result before returning it: the result flows outward, so the
  **outermost extension transforms last**, as in every middleware.

```typescript
/** A read-through cache: a hit skips `next`, hence the reader. */
class CacheExtension<TItem>
  extends Subscribable<EventsDefinition>
  implements IDataSourceExtension<TItem>
{
  private readonly _cache = new Map<string, TItem[]>();
  public async readItems(
    payload: DataSourcePayload<TItem>,
    next: DataSourceReadNext<TItem>,
  ): Promise<TItem[]> {
    const key = createHash(payload);
    const hit = this._cache.get(key);
    if (hit) return hit;
    const items = await next(payload);
    this._cache.set(key, items);
    return items;
  }
}
```

The latest read still wins inside the chain: every layer, the reader
included, rejects with the `AbortedException` of ts-core once the read is
superseded, so a `next` called or pending after that rejects, and a result
returned in silence never reaches the outer layers nor the source. Two
things such extensions cannot do, by design: a cache does not intercept the
count of the pagination, which runs in the build phase with a reader of its
own (decorate the count reader instead); and a batching does not compose with
the pagination for free, since merging N results already paginated does not
give the right page.

`readItems` sees the **whole payload**, whatever the position of its key: the
build phase completes before any reading. It decides what reading means:

- call `next` **zero** times: a cache hit returns its items and the reader is
  never invoked;
- call it **once**, with the payload given or another one;
- call it **N** times, e.g. for a backend taking one sort per call: one read
  per sort, results merged. Every call runs the inner layers and the reader
  again, so their hooks and events fire as many times;
- transform the result before returning it: the result flows outward, so the
  **outermost extension transforms last**, as in every middleware.

```typescript
/** A read-through cache: a hit skips `next`, hence the reader. */
class CacheExtension<TItem>
  extends Subscribable<EventsDefinition>
  implements IDataSourceExtension<TItem>
{
  private readonly _cache = new Map<string, TItem[]>();
  public async readItems(
    payload: DataSourcePayload<TItem>,
    next: DataSourceReadNext<TItem>,
  ): Promise<TItem[]> {
    const key = createHash(payload);
    const hit = this._cache.get(key);
    if (hit) return hit;
    const items = await next(payload);
    this._cache.set(key, items);
    return items;
  }
}
```

The latest read still wins inside the chain: every layer, the reader
included, rejects with the `AbortedException` of ts-core once the read is
superseded, so a `next` called or pending after that rejects, and a result
returned in silence never reaches the outer layers nor the source. Two
things such extensions cannot do, by design: a cache does not intercept the
count of the pagination, which runs in the build phase with a reader of its
own (decorate the count reader instead); and a batching does not compose with
the pagination for free, since merging N results already paginated does not
give the right page.

## API Reference

The generated API documentation, release notes included, is published at
[https://mantlebee.github.io/ts-data/](https://mantlebee.github.io/ts-data/).

## Project Structure

- [`src/query-items`](src/query-items/README.md): the query model (`QueryItemsPayload`, filters, sorts, pagination, projections), the `FilterRange` helpers and the in-memory reader.
- [`src/data-source`](src/data-source/README.md): `DataSource` and `createDataSource`; `extensions/` holds the extension contract, the base class and the typing of the extensions by key (`IDataSourceWith`), next to the extensions shipped with the package.
- `docs/release-notes`: one file per release with the migration guide; `docs/api` is generated by `npm run doc`.
- `test/fixtures`: deterministic items and readers used by the tests.

Scripts: `npm run build` (CommonJS + ES modules into `dist`), `npm test`,
`npm run coverage` (95 % threshold), `npm run lint` (ESLint, Prettier and the
type-check; `npm run lint:fix` and `npm run format` fix what they can),
`npm run doc`, `npm run doc:publish`.

## Contributing

Issues and pull requests are welcome at
[github.com/mantlebee/ts-data](https://github.com/mantlebee/ts-data). Every
export has TSDoc and tests: keep both up to date, and run `npm run lint` and
`npm run coverage` before opening a pull request.

## License

MIT
