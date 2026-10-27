import { List } from "@mantlebee/ts-core";

import {
  DataSource,
  FilterExtension,
  PaginationExtension,
  ProjectionExtension,
  SortExtension,
} from "@/data-source";
import { GenericItem, GenericItems } from "@test/fixtures";

import { FilterLogics, FilterOperators } from "../../filtering/constants";
import { Filter } from "../../filtering/types";
import { Paging } from "../../pagination/types";
import { QueryItemsPayload } from "../../types";
import { countItems, createInMemoryReader, queryItems } from "../utils";

/** Ids of the items, in order: what every assertion compares. */
function ids(items: List<GenericItem>): List<number> {
  return items.map((a) => a.id);
}
/** A payload with the given filters, combined with `and`. */
function where(...filters: List<Filter<GenericItem>>): QueryItemsPayload<GenericItem> {
  return { filters: { filters, logic: FilterLogics.and } };
}
function paging(page: number, itemsPerPage: number): Paging {
  return { itemsPerPage, page, totalItemsCount: 0 };
}

const WOMEN_IDS = [4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

describe("query-items", () => {
  describe("in-memory", () => {
    describe("queryItems", () => {
      test("Without query returns a copy of the list", () => {
        const result = queryItems(GenericItems, {});
        expect(result).toEqual(GenericItems);
        expect(result).not.toBe(GenericItems);
      });
      test("Applies the filters with the options", () => {
        const payload = where({ field: "lastName", operator: FilterOperators.equal, value: "diam" });
        expect(ids(queryItems(GenericItems, payload))).toEqual([4, 9, 18]);
        expect(queryItems(GenericItems, payload, { caseSensitive: true })).toEqual([]);
      });
      test("Applies the sorts with the options", () => {
        const items = [{ name: "b" }, { name: "a" }, { name: "C" }];
        const payload = { sorts: [{ asc: true, field: "name" as const }] };
        expect(queryItems(items, payload).map((a) => a.name)).toEqual(["a", "b", "C"]);
        expect(queryItems(items, payload, { caseSensitive: true }).map((a) => a.name)).toEqual(["C", "a", "b"]);
      });
      test("Paging applies after filtering and sorting", () => {
        const result = queryItems(GenericItems, {
          ...where({ field: "gender", operator: FilterOperators.equal, value: "F" }),
          paging: paging(2, 5),
          sorts: [{ asc: false, field: "age" }],
        });
        expect(ids(result)).toEqual([13, 7, 9, 15, 4]);
      });
      test("Projections apply after sorting, so a dropped field still orders", () => {
        const result = queryItems(GenericItems, {
          ...where({ field: "gender", operator: FilterOperators.equal, value: "F" }),
          paging: paging(1, 3),
          projections: [{ field: "id" }],
          sorts: [{ asc: false, field: "age" }],
        });
        expect(result).toEqual([{ id: 11 }, { id: 23 }, { id: 17 }]);
      });
      test("Distinct drops the duplicates of the projection before paging", () => {
        const result = queryItems(GenericItems, {
          distinct: true,
          paging: paging(1, 10),
          projections: [{ field: "gender" }],
          sorts: [{ asc: true, field: "gender" }],
        });
        expect(result).toEqual([{ gender: "F" }, { gender: "M" }]);
      });
      test("Distinct without projections works on the whole items", () => {
        const twice = GenericItems.slice(0, 2).concat(GenericItems.slice(0, 2));
        expect(ids(queryItems(twice, {}))).toEqual([1, 2, 1, 2]);
        expect(ids(queryItems(twice, { distinct: true }))).toEqual([1, 2]);
      });
      test("Neither the list nor its items are mutated", () => {
        const items = Object.freeze(GenericItems.map((a) => Object.freeze({ ...a })));
        const snapshot = JSON.stringify(items);
        const result = queryItems(items as List<GenericItem>, {
          ...where({ field: "age", operator: FilterOperators.greaterThan, value: 30 }),
          paging: paging(1, 3),
          projections: [{ field: "id" }, { field: "age" }],
          sorts: [{ asc: false, field: "age" }],
        });
        expect(result).toEqual([{ age: 71, id: 14 }, { age: 63, id: 8 }, { age: 61, id: 20 }]);
        expect(JSON.stringify(items)).toBe(snapshot);
      });
    });

    describe("countItems", () => {
      test("Counts the whole list without filters", () => {
        expect(countItems(GenericItems, {})).toBe(GenericItems.length);
      });
      test("Counts the items matching the filters, ignoring sorts and paging", () => {
        const count = countItems(GenericItems, {
          ...where({ field: "gender", operator: FilterOperators.equal, value: "F" }),
          paging: paging(1, 5),
          sorts: [{ asc: true, field: "age" }],
        });
        expect(count).toBe(WOMEN_IDS.length);
      });
      test("Honours the options", () => {
        const payload = where({ field: "lastName", operator: FilterOperators.equal, value: "diam" });
        expect(countItems(GenericItems, payload)).toBe(3);
        expect(countItems(GenericItems, payload, { caseSensitive: true })).toBe(0);
      });
      test("Counts the distinct projected items, so the count agrees with the pages", () => {
        expect(countItems(GenericItems, { projections: [{ field: "gender" }] })).toBe(GenericItems.length);
        expect(countItems(GenericItems, { distinct: true, projections: [{ field: "gender" }] })).toBe(2);
        expect(countItems(GenericItems, { ...where({ field: "gender", operator: FilterOperators.equal, value: "F" }), distinct: true, projections: [{ field: "gender" }] })).toBe(1);
        const twice = GenericItems.slice(0, 2).concat(GenericItems.slice(0, 2));
        expect(countItems(twice, { distinct: true })).toBe(2);
      });
    });

    describe("createInMemoryReader", () => {
      test("The reader resolves the page, the count reader the matching items", async () => {
        const { countReader, reader } = createInMemoryReader(GenericItems);
        const payload: QueryItemsPayload<GenericItem> = {
          ...where({ field: "gender", operator: FilterOperators.equal, value: "F" }),
          paging: paging(1, 5),
          sorts: [{ asc: false, field: "age" }],
        };
        expect(ids(await reader(payload))).toEqual([11, 23, 17, 19, 5]);
        expect(await countReader(payload)).toBe(WOMEN_IDS.length);
      });
      test("A getter is read on every call, so the list can be swapped", async () => {
        let items = GenericItems.slice(0, 2);
        const { countReader, reader } = createInMemoryReader(() => items);
        expect(ids(await reader({}))).toEqual([1, 2]);
        expect(await countReader({})).toBe(2);
        items = GenericItems.slice(0, 5);
        expect(ids(await reader({}))).toEqual([1, 2, 3, 4, 5]);
        expect(await countReader({})).toBe(5);
      });
      test("The readers pass the options on", async () => {
        const { countReader, reader } = createInMemoryReader(GenericItems, { caseSensitive: true });
        const payload = where({ field: "lastName", operator: FilterOperators.equal, value: "diam" });
        expect(await reader(payload)).toEqual([]);
        expect(await countReader(payload)).toBe(0);
      });
      test("The readers resolve asynchronously, so isReading is observable", async () => {
        const { reader } = createInMemoryReader(GenericItems);
        const dataSource = new DataSource<GenericItem>(reader);
        const isReading: List<boolean> = [];
        dataSource.on("isReading", (value) => isReading.push(value));
        const read = dataSource.read();
        expect(dataSource.isReading).toBe(true);
        await read;
        expect(dataSource.isReading).toBe(false);
        expect(isReading).toEqual([true, false]);
        expect(dataSource.items).toEqual(GenericItems);
      });
      test("With a delay the readers resolve after it", async () => {
        jest.useFakeTimers();
        try {
          const { countReader, reader } = createInMemoryReader(GenericItems, { delay: 500 });
          let items: List<GenericItem> | undefined;
          let count: number | undefined;
          reader({}).then((a) => (items = a));
          countReader({}).then((a) => (count = a));
          await jest.advanceTimersByTimeAsync(499);
          expect(items).toBeUndefined();
          expect(count).toBeUndefined();
          await jest.advanceTimersByTimeAsync(1);
          expect(items).toEqual(GenericItems);
          expect(count).toBe(GenericItems.length);
        } finally {
          jest.useRealTimers();
        }
      });
      test("Drives a data source with filtering, sorting and pagination", async () => {
        const { countReader, reader } = createInMemoryReader(GenericItems);
        const filtering = new FilterExtension<GenericItem>();
        const sorting = new SortExtension<GenericItem>();
        const paginating = new PaginationExtension<GenericItem>(countReader, 5);
        const dataSource = new DataSource<GenericItem>(reader, [filtering, sorting, paginating]);
        filtering.addFilter({ field: "gender", operator: FilterOperators.equal, value: "F" });
        sorting.addSort({ asc: false, field: "age" });
        await dataSource.read();
        expect(paginating.totalItemsCount).toBe(WOMEN_IDS.length);
        expect(paginating.lastPage).toBe(3);
        expect(ids(dataSource.items)).toEqual([11, 23, 17, 19, 5]);
        paginating.goToNextPage();
        await dataSource.read();
        expect(ids(dataSource.items)).toEqual([13, 7, 9, 15, 4]);
        paginating.goToLastPage();
        await dataSource.read();
        expect(ids(dataSource.items)).toEqual([21]);
        await dataSource.dispose();
      });
      test("Drives a data source with a projection", async () => {
        const { reader } = createInMemoryReader(GenericItems);
        const projecting = new ProjectionExtension<GenericItem>();
        const sorting = new SortExtension<GenericItem>();
        const dataSource = new DataSource<GenericItem>(reader, [projecting, sorting]);
        projecting.setProjections([{ field: "id" }]);
        sorting.addSort({ asc: false, field: "id" });
        await dataSource.read();
        expect(dataSource.items.slice(0, 2)).toEqual([{ id: 24 }, { id: 23 }]);
        await dataSource.dispose();
      });
    });
  });
});
