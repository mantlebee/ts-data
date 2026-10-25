import { DataSource } from "../../models";
import { FilterExtension } from "../../filtering/models";
import { SortExtension } from "../../sorting/models";
import { ProjectionExtension } from "../../projection/models";
import { DataSourcePayload } from "../../types";
import { PaginationExtension } from "../models";
import { PaginationExtensionOptions } from "../types";
import { Filter, FilterLogics, FilterOperators, FiltersExpression, Sort } from "@/query-items";

type Item = { id: number; name: string };

const filterId: Filter<Item> = { field: "id", operator: FilterOperators.equal, value: 1 };
const filterName: Filter<Item> = { field: "name", operator: FilterOperators.contains, value: "o" };

/**
 * 50 items, 10 per page, already read and sitting on page 3.
 */
async function setup(options?: PaginationExtensionOptions<Item>) {
  const reader = jest.fn(
    async (_payload: DataSourcePayload<Item>) => [] as Item[],
  );
  const filtering = new FilterExtension<Item>();
  const sorting = new SortExtension<Item>();
  const projecting = new ProjectionExtension<Item>();
  const paginating = new PaginationExtension<Item>(
    async () => 50,
    10,
    undefined,
    options,
  );
  const dataSource = new DataSource<Item>(reader, [
    filtering,
    sorting,
    projecting,
    paginating,
  ]);
  await dataSource.read();
  paginating.goToPage(3);
  expect(paginating.page).toBe(3);
  reader.mockClear();
  return { dataSource, filtering, paginating, projecting, reader, sorting };
}

describe("PaginationExtension resetPageOnQueryChange", () => {
  describe("default (true)", () => {
    test("The first read never resets the page", async () => {
      const paginating = new PaginationExtension<Item>(async () => 50, 10);
      const handler = jest.fn();
      paginating.on("page", handler);
      await paginating.getItemsBefore({ filters: { logic: FilterLogics.and, filters: [] } });
      expect(handler).not.toHaveBeenCalled();
      expect(paginating.page).toBe(1);
    });
    test("A read with the same query keeps the page", async () => {
      const { dataSource, paginating, reader } = await setup();
      await dataSource.read();
      expect(paginating.page).toBe(3);
      expect(reader.mock.calls[0][0].paging?.page).toBe(3);
    });
    test("A filter added before the read brings the page back to 1 in the payload", async () => {
      const { dataSource, filtering, paginating, reader } = await setup();
      filtering.addFilter(filterId);
      await dataSource.read();
      expect(paginating.page).toBe(1);
      expect(reader.mock.calls[0][0].paging?.page).toBe(1);
    });
    test("The page is reset before the count reader is called", async () => {
      const pages: number[] = [];
      const paginating = new PaginationExtension<Item>(async () => {
        pages.push(paginating.page);
        return 50;
      }, 10);
      await paginating.getItemsBefore({});
      paginating.goToPage(3);
      await paginating.getItemsBefore({ filters: { logic: FilterLogics.and, filters: [filterId] } });
      expect(pages).toEqual([1, 1]);
    });
    test("A single page event is raised when the page is reset", async () => {
      const { dataSource, filtering, paginating } = await setup();
      const handler = jest.fn();
      paginating.on("page", handler);
      filtering.addFilter(filterId);
      await dataSource.read();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
    });
    test("No page event is raised when already on page 1", async () => {
      const { dataSource, filtering, paginating } = await setup();
      paginating.goToFirstPage();
      const handler = jest.fn();
      paginating.on("page", handler);
      filtering.addFilter(filterId);
      await dataSource.read();
      expect(handler).not.toHaveBeenCalled();
    });
    test("A filter removed and added back is not a change", async () => {
      const { dataSource, filtering, paginating } = await setup();
      filtering.addFilter(filterId);
      await dataSource.read();
      paginating.goToPage(3);
      filtering.removeFilter(filterId);
      filtering.addFilter(filterId);
      await dataSource.read();
      expect(paginating.page).toBe(3);
    });
    test("A changed sort resets the page", async () => {
      const { dataSource, paginating, sorting } = await setup();
      sorting.addSort({ field: "name", asc: true });
      await dataSource.read();
      expect(paginating.page).toBe(1);
    });
    test("A changed projection resets the page", async () => {
      const { dataSource, paginating, projecting } = await setup();
      projecting.addProjection({ field: "name" });
      await dataSource.read();
      expect(paginating.page).toBe(1);
    });
    test("A changed filters logic resets the page", async () => {
      const { dataSource, filtering, paginating } = await setup();
      filtering.addFilter(filterId);
      filtering.addFilter(filterName);
      await dataSource.read();
      paginating.goToPage(3);
      filtering.setLogic(FilterLogics.or);
      await dataSource.read();
      expect(paginating.page).toBe(1);
    });
    test("Only the paging of the previous read is ignored", async () => {
      const paginating = new PaginationExtension<Item>(async () => 50, 10);
      await paginating.getItemsBefore({});
      paginating.goToPage(3);
      await paginating.getItemsBefore({
        paging: { itemsPerPage: 1, page: 1, totalItemsCount: 1 },
      });
      expect(paginating.page).toBe(3);
    });
    test("The property order of the payload does not matter", async () => {
      const paginating = new PaginationExtension<Item>(async () => 50, 10);
      const filters: FiltersExpression<Item> = { logic: FilterLogics.and, filters: [filterId] };
      const sorts: Sort<Item>[] = [{ field: "name", asc: true }];
      await paginating.getItemsBefore({ filters, sorts: [...sorts] });
      paginating.goToPage(3);
      await paginating.getItemsBefore({ sorts: [...sorts], filters });
      expect(paginating.page).toBe(3);
    });
  });

  describe("false", () => {
    test("A changed filter keeps the page", async () => {
      const { dataSource, filtering, paginating, reader } = await setup({
        resetPageOnQueryChange: false,
      });
      filtering.addFilter(filterId);
      await dataSource.read();
      expect(paginating.page).toBe(3);
      expect(reader.mock.calls[0][0].paging?.page).toBe(3);
    });
  });

  describe("list of properties", () => {
    test("A change of a listed property resets the page", async () => {
      const { dataSource, filtering, paginating } = await setup({
        resetPageOnQueryChange: ["filters"],
      });
      filtering.addFilter(filterId);
      await dataSource.read();
      expect(paginating.page).toBe(1);
    });
    test("A change of a property not listed keeps the page", async () => {
      const { dataSource, paginating, sorting } = await setup({
        resetPageOnQueryChange: ["filters"],
      });
      sorting.addSort({ field: "name", asc: true });
      await dataSource.read();
      expect(paginating.page).toBe(3);
    });
    test("An empty list never resets the page", async () => {
      const { dataSource, filtering, paginating } = await setup({
        resetPageOnQueryChange: [],
      });
      filtering.addFilter(filterId);
      await dataSource.read();
      expect(paginating.page).toBe(3);
    });
  });
});
