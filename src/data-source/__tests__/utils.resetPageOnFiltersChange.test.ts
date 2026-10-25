import {
  DataSource,
  DataSourcePayload,
  FilterExtension,
  PaginationExtension,
  resetPageOnFiltersChange,
} from "@/data-source";
import { Filter, FilterLogics, FilterOperators } from "@/query-items";

type Item = { id: number; name: string };

const filterId: Filter<Item> = {
  field: "id",
  operator: FilterOperators.equal,
  value: 1,
};
const filterName: Filter<Item> = {
  field: "name",
  operator: FilterOperators.contains,
  value: "o",
};

/**
 * 50 items, 10 per page, already read and sitting on page 3.
 */
async function setup() {
  const reader = jest.fn(async (_payload: DataSourcePayload<Item>) => [] as Item[]);
  const filtering = new FilterExtension<Item>();
  const paginating = new PaginationExtension<Item>(async () => 50, 10);
  const dataSource = new DataSource<Item>(reader, { filtering, paginating });
  await dataSource.read();
  paginating.goToPage(3);
  expect(paginating.page).toBe(3);
  reader.mockClear();
  return { dataSource, filtering, paginating, reader };
}

describe("resetPageOnFiltersChange", () => {
  const changes: [string, (filtering: FilterExtension<Item>) => void][] = [
    ["addFilter", (f) => f.addFilter(filterId)],
    ["removeFilter", (f) => f.removeFilter(filterId)],
    ["removeFiltersOf", (f) => f.removeFiltersOf("id")],
    ["replaceFiltersOf", (f) => f.replaceFiltersOf("id", filterId)],
    ["setFilters", (f) => f.setFilters([filterId, filterName])],
    ["clearFilters", (f) => f.clearFilters()],
    ["setLogic", (f) => f.setLogic(FilterLogics.or)],
  ];

  test.each(changes)(
    "%s brings the page back to 1 synchronously",
    async (_name, change) => {
      const { filtering, paginating } = await setup();
      resetPageOnFiltersChange(filtering, paginating);
      change(filtering);
      expect(paginating.page).toBe(1);
    },
  );

  test("The page is not reset by a filter change made before subscribing", async () => {
    const { filtering, paginating } = await setup();
    filtering.addFilter(filterId);
    expect(paginating.page).toBe(3);
  });

  test("The page is reset before a read that immediately follows the filter change", async () => {
    const { dataSource, filtering, paginating, reader } = await setup();
    resetPageOnFiltersChange(filtering, paginating);
    filtering.addFilter(filterId);
    await dataSource.read();
    expect(reader).toHaveBeenCalledTimes(1);
    expect(reader.mock.calls[0][0].paging?.page).toBe(1);
  });

  test("Without the reset the next read keeps asking for the old page", async () => {
    const { dataSource, filtering, reader } = await setup();
    filtering.addFilter(filterId);
    await dataSource.read();
    expect(reader.mock.calls[0][0].paging?.page).toBe(3);
  });

  test("Disposing the returned subscription stops the reset", async () => {
    const { filtering, paginating } = await setup();
    const subscription = resetPageOnFiltersChange(filtering, paginating);
    await subscription.dispose();
    for (const [, change] of changes) {
      paginating.goToPage(3);
      change(filtering);
      expect(paginating.page).toBe(3);
    }
  });

  test("No page event is raised when already on page 1", async () => {
    const { filtering, paginating } = await setup();
    paginating.goToFirstPage();
    resetPageOnFiltersChange(filtering, paginating);
    const handler = jest.fn();
    paginating.on("page", handler);
    for (const [, change] of changes) change(filtering);
    expect(handler).not.toHaveBeenCalled();
  });

  test("A single page event is raised when the page is reset from another page", async () => {
    const { filtering, paginating } = await setup();
    resetPageOnFiltersChange(filtering, paginating);
    const handler = jest.fn();
    paginating.on("page", handler);
    filtering.addFilter(filterId);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });
});
