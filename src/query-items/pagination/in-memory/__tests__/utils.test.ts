import { List } from "@mantlebee/ts-core";

import { GenericItem, GenericItems } from "@test/fixtures";

import { Pagination } from "../../types";
import { pageItems } from "../utils";

/** Ids of the items, in order: what every assertion compares. */
function ids(items: List<GenericItem>): List<number> {
  return items.map((a) => a.id);
}
function pagination(page: number, itemsPerPage: number): Pagination {
  return { itemsPerPage, page, totalItemsCount: 0 };
}

describe("query-items", () => {
  describe("pagination", () => {
    describe("in-memory", () => {
      describe("pageItems", () => {
        test("Without pagination returns a copy of the list", () => {
          const result = pageItems(GenericItems);
          expect(result).toEqual(GenericItems);
          expect(result).not.toBe(GenericItems);
        });
        test("Returns the requested page, pages are 1-based", () => {
          expect(ids(pageItems(GenericItems, pagination(1, 10)))).toEqual([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
          ]);
          expect(ids(pageItems(GenericItems, pagination(2, 10)))).toEqual([
            11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          ]);
          expect(ids(pageItems(GenericItems, pagination(3, 10)))).toEqual([
            21, 22, 23, 24,
          ]);
        });
        test("A page beyond the last one is empty", () => {
          expect(pageItems(GenericItems, pagination(4, 10))).toEqual([]);
        });
        test("A page lower than 1 is read as the first one", () => {
          expect(ids(pageItems(GenericItems, pagination(0, 5)))).toEqual([
            1, 2, 3, 4, 5,
          ]);
          expect(ids(pageItems(GenericItems, pagination(-3, 5)))).toEqual([
            1, 2, 3, 4, 5,
          ]);
        });
        test("totalItemsCount is ignored", () => {
          const result = pageItems(GenericItems, {
            itemsPerPage: 5,
            page: 1,
            totalItemsCount: 2,
          });
          expect(ids(result)).toEqual([1, 2, 3, 4, 5]);
        });
        test("The list is not mutated", () => {
          const items = Object.freeze(GenericItems.slice());
          expect(
            ids(pageItems(items as List<GenericItem>, pagination(2, 20))),
          ).toEqual([21, 22, 23, 24]);
          expect(items).toEqual(GenericItems);
        });
      });
    });
  });
});
