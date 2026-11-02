import { List } from "@mantlebee/ts-core";

import { ILookupSource, LookupPage, LookupSearchResult } from "@/lookup";

/** Item of the lookup tests: a department, keyed by `id`, searched by `name`. */
export type Department = { id: number; name: string };

export const Departments: List<Department> = [
  { id: 1, name: "Sales" },
  { id: 2, name: "Marketing" },
  { id: 3, name: "Research" },
  { id: 4, name: "Support" },
];

/**
 * A lookup source over {@link Departments} whose calls are spied: `resolve`
 * serves the departments of the ids asked, in the order of the list,
 * `search` serves every department, `valueOf` reads the id. The spies tell
 * how many times, and with what, a decorator called the inner source.
 */
export type StubLookupSource = {
  resolve: jest.Mock<Promise<List<Department>>, [List<number>, AbortSignal?]>;
  search: jest.Mock<
    Promise<LookupSearchResult<Department>>,
    [string, LookupPage, AbortSignal?]
  >;
  source: ILookupSource<Department, number>;
};

/**
 * Creates a {@link StubLookupSource}.
 * @param items Departments to serve, {@link Departments} by default.
 */
export function createStubLookupSource(
  items: List<Department> = Departments,
): StubLookupSource {
  const resolve: StubLookupSource["resolve"] = jest.fn(async (values) =>
    items.filter((item) => values.includes(item.id)),
  );
  const search: StubLookupSource["search"] = jest.fn(async (_query, _page) => ({
    hasMore: false,
    items,
  }));
  return { resolve, search, source: { resolve, search, valueOf: (a) => a.id } };
}

/** Lets the pending promises and the queued microtasks run. */
export const tick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));
