# `query-items`

**The query model**: plain types describing what to read, agnostic of the
storage that runs the query. A reader (yours) translates a
`QueryItemsPayload` into the actual request; the extensions of
[`data-source`](../data-source) build it.

## What's in here

- **`types.ts`** — `QueryItemsPayload<TItem>`: `distinct?`, `filters?`,
  `paging?`, `projections?`, `sorts?`, every property optional and set only by
  who needs it.
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
  - **`range/`** — `Range<TValue>` / `RangeLimit<TValue>` (the value of a
    `range` filter: `min`/`max`, each with `value` and `exclude`), and the
    editable `FilterRange` / `FilterRangeLimit`, `Subscribable`s meant for UI
    controls: `setValue`, `setExclude`, `toggleExclude`, one `change` event
    raised only on an actual change, `toRange()` / `toRangeLimit()` to get the
    plain value.
- **`pagination/`** — `Paging`: `page` (1-based), `itemsPerPage`,
  `totalItemsCount`.
- **`projection/`** — `Projection<TItem>`: the `field` to return.
- **`sorting/`** — `Sort<TItem>` (`field`, `asc`) and the pure helpers
  `addSort(sort, sorts, sortsLimit = 0)` (replaces the sort on the same field,
  honours the limit) and `removeSort(field, sorts)`.
