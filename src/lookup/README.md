# `lookup`

**A stateless source of reference items.** A combobox searches departments by
name, a lookup column of a grid shows the department of each row from its id:
both ask questions of the same entity, many at a time, and need no cursor. A
data source is a cursor, one query and one `items`, "the latest read wins";
`ILookupSource` is a request/response contract instead: each call has its own
parameters, its own result and its own `AbortSignal`, nothing is shared
between calls, so one instance serves any number of consumers at once.

## What's in here

- **`interfaces.ts`** — `ILookupSource<TItem, TValue>`: `search(query, page,
signal?)` pages the items whose text contains `query` and tells whether
  more follow (`LookupSearchResult`); `resolve(values, signal?)` returns the
  items of the keys given, without the missing ones, in no particular order;
  `valueOf(item)` is the key of an item, what `resolve` resolves by and what a
  widget emits as its value. An aborted call rejects with the
  `AbortedException` of ts-core, like a superseded read of a data source.
- **`types.ts`** — `LookupValue` (`number | string`, the default key type:
  keys are compared with `===`, keep them primitive), `LookupPage`
  (`{ limit, offset }`, `offset` a multiple of `limit`),
  `LookupSearchResult<TItem>` (`{ hasMore, items }`),
  `LookupReaderOptions<TItem, TValueField>` (`textField`, `valueField`).
- **`utils.ts`** — `createLookupSource(reader, options)`: a source over the
  same `QueryItemsReader` a data source reads through; `search` sends
  `textField contains query` (no filter for `""`) with the 1-based
  `pagination` of the page, `resolve` sends `valueField in values` without
  pagination and never calls the reader for an empty list, `valueOf` reads
  `valueField`, whose type becomes the key type of the source. `hasMore` is
  `items.length >= limit`: no count reader, at the cost of one empty page
  when the total is a multiple of `limit`. The signal goes to the reader as
  it is, and the call rejects with `AbortedException` as soon as it is
  aborted, whatever the reader does with it.
  `createInMemoryLookupSource(items | getItems, options)`: the same over a
  list, through `createInMemoryQueryItemsReader` of `query-items`, with its
  comparison options (`caseSensitive`, `toComparable`).
- **`batching/`** — `withBatching(source, { chunkSize? })`: coalesces the
  `resolve` calls of the same microtask into one call of the inner source
  with the distinct values (`chunkSize` caps the values of one call), and
  gives each caller the items of its own values, picked with `valueOf`. A
  rejected call rejects every caller of the batch. The inner call runs
  without a signal, so one caller's abort does not starve the others: the
  aborted caller alone rejects, at once.
- **`caching/`** — `withCache(source)`: an `ICachedLookupSource` that
  remembers the item of every resolved value for the life of the source, only
  asks the inner source the values it has never seen, shares a pending
  resolution among the callers asking for the same value, remembers a value
  the source does not return as missing and forgets a rejected one;
  `invalidate(values?)` forgets entries by hand, pending ones included. The
  inner call runs without a signal, as in `withBatching`.
- **`internals.ts`** — `abortable(signal, run)`, not exported: runs `run` and
  rejects with `AbortedException` as soon as the signal is aborted, ignoring a
  late settlement. The one piece of abort handling of the folder.

## How it fits together

```typescript
const departments = withCache(
  withBatching(
    createLookupSource(
      (payload, signal) => api.getDepartments(payload, { signal }),
      { textField: "name", valueField: "id" },
    ),
  ),
); // ICachedLookupSource<Department, number>

// A combobox panel and a page of grid cells, on the same instance, at once.
const panel = departments.search("sal", { limit: 20, offset: 0 }, signal);
const cells = rows.map((row) => departments.resolve([row.departmentId]));
```

The cells of one render share one `id in [...]` request (batching), a
department already shown is never asked again (cache), and the panel runs its
own query meanwhile: no lock, no restore of filters, no shared `items`.

A `FilterExtension` of a data source is still the right tool for a grid or a
list the user browses: one query, one page, events on every change. The
lookup source is for the widgets that ask about reference items on behalf of
other data.
