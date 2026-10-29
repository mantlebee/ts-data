# `query-items`

**The query model**: plain types describing what to read, agnostic of the
storage that runs the query. A reader (yours) translates a
`QueryItemsPayload` into the actual request; the extensions of
[`data-source`](../data-source) build it. Every feature folder carries an
`in-memory` subfolder resolving its part of the payload over a plain array,
and the `in-memory` folder composes them into the one reader of the package.

## What's in here

- **`types.ts`** — `QueryItemsPayload<TItem>`: `distinct?`, `filters?`,
  `paging?`, `projections?`, `sorts?`, every property optional and set only by
  who needs it. `QueryItemsReader<TItem, TResult = List<TItem>>`: the function
  `(payload, signal?) => Promise<TResult>` resolving a payload into a result
  (`DataSourceReader` of `data-source` is the same type); the optional
  `AbortSignal` is aborted when the read is superseded by a newer one.
- **`filtering/`**:
  - **`constants.ts`** — `FilterLogics` (`and`, `or`) and `FilterOperators`
    (`eq`, `ne`, `gt`, `ge`, `lt`, `le`, `contains`, `notContains`, `in`,
    `notIn`, `startsWith`, `endsWith`, `eqi`, `between`): OData 4 values where
    OData defines them, the most common naming otherwise.
  - **`types.ts`** — `Filter<TItem>`, a union discriminated by `operator`:
    `ListFilter` (`in`/`notIn`, `value` is a list), `RangeFilter` (`range`,
    `value` is a `Range`), `ValueFilter` (everything else, nullable value).
    `FiltersExpression<TItem>` is a tree whose node is either a `FiltersList`
    (`{ logic, filters }`) or a `FiltersGroup` (`{ logic, groups }`), never both.
  - **`utils.ts`** — `isFiltersList`, `isFiltersGroup`: type guards to walk an
    expression.
  - **`in-memory/`** — `filterItems(items, filters?, options?)`: the items
    matching an expression (every operator, trees at any depth, an empty node
    matches every item); `itemMatchesFilterExpression(item, expression, options?)` and
    `itemMatchesFilter(item, filter, options?)` for a single item.
  - **`range/`** — `Range<TValue>` / `RangeLimit<TValue>` (the value of a
    `range` filter: `min`/`max`, each with `value` and `exclude`), and the
    editable `FilterRange` / `FilterRangeLimit`, `Subscribable`s meant for UI
    controls: `setValue`, `setExclude`, `toggleExclude`, one `change` event
    raised only on an actual change, `toRange()` / `toRangeLimit()` to get the
    plain value.
- **`in-memory/`** — the reader of the package, composed from the
  `in-memory` delegates of the features: `queryItems(items, payload, options?)`
  (`filterItems`, then `sortItems`, then `projectItems` and `distinctItems`,
  then `pageItems`), `countItems(items, payload, options?)` (the matching
  items, distinct ones when the payload says so, for the pagination) and
  `createInMemoryQueryItemsReader(getItems, options?)` returning
  `{ reader, countReader }` for a `DataSource`, calling the getter on every
  read and resolving on the next microtask. `comparer.ts` holds what the delegates
  share: `toComparableValue`, the default conversion of the compared values
  (strings lower-cased unless `options.caseSensitive`, `Date` by time, value
  objects by `valueOf()`), overridable per field with `options.toComparable`,
  and `createInMemoryQueryItemsComparer(options?)` resolving the options into the
  `InMemoryQueryItemsComparer`. Types: `InMemoryQueryItemsComparer`,
  `InMemoryQueryItemsReaderOptions`, `InMemoryQueryItemsReader`.
- **`pagination/`** — `Paging`: `page` (1-based), `itemsPerPage`,
  `totalItemsCount`.
  - **`in-memory/`** — `pageItems(items, paging?)`: the items of the page,
    1-based, empty beyond the last one.
- **`projection/`** — `Projection<TItem>`: the `field` to return.
  - **`in-memory/`** — `projectItems(items, projections?)`: new objects with
    the projected fields only; `distinctItems(items)`: the first occurrence
    of every item, duplicates found by value on the fields.
- **`sorting/`** — `Sort<TItem>` (`field`, `asc`) and the pure helpers
  `addSort(sort, sorts, sortsLimit = 0)` (replaces the sort on the same field,
  honours the limit) and `removeSort(field, sorts)`.
  - **`in-memory/`** — `sortItems(items, sorts?, options?)`: stable, by
    priority, unset values first ascending.
