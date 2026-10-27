import { List } from "@mantlebee/ts-core";

import { GenericItem, GenericItems } from "@test/fixtures";

import { distinctItems, projectItems } from "../utils";

describe("query-items", () => {
  describe("projection", () => {
    describe("in-memory", () => {
      describe("projectItems", () => {
        test("Without projections returns a copy of the list, items untouched", () => {
          const none = projectItems(GenericItems);
          expect(none).toEqual(GenericItems);
          expect(none).not.toBe(GenericItems);
          expect(none[0]).toBe(GenericItems[0]);
          const empty = projectItems(GenericItems, []);
          expect(empty).toEqual(GenericItems);
          expect(empty).not.toBe(GenericItems);
        });
        test("Keeps only the projected fields, as new objects", () => {
          const result = projectItems(GenericItems.slice(0, 2), [{ field: "id" }, { field: "lastName" }]);
          expect(result).toEqual([
            { id: 1, lastName: "Consectetur" },
            { id: 2, lastName: "Congue" },
          ]);
          expect(result[0]).not.toBe(GenericItems[0]);
        });
        test("A field projected twice is kept once", () => {
          const result = projectItems(GenericItems.slice(0, 1), [{ field: "id" }, { field: "id" }]);
          expect(result).toEqual([{ id: 1 }]);
          expect(Object.keys(result[0])).toEqual(["id"]);
        });
        test("A field the item lacks is not added", () => {
          const items = [{ name: "a" }, {}] as List<{ name?: string }>;
          const result = projectItems(items, [{ field: "name" }]);
          expect(result).toEqual([{ name: "a" }, {}]);
          expect("name" in result[1]).toBe(false);
        });
        test("Null and undefined items stay as they are", () => {
          const items = [null, undefined, { name: "a" }] as List<{ name?: string }>;
          const result = projectItems(items, [{ field: "name" }]);
          expect(result).toEqual([null, undefined, { name: "a" }]);
        });
        test("Neither the list nor its items are mutated", () => {
          const items = Object.freeze(GenericItems.map((a) => Object.freeze({ ...a })));
          const snapshot = JSON.stringify(items);
          projectItems(items as List<GenericItem>, [{ field: "age" }]);
          expect(JSON.stringify(items)).toBe(snapshot);
        });
      });

      describe("distinctItems", () => {
        test("Keeps the first occurrence of every item, in its order", () => {
          const genders = distinctItems(projectItems(GenericItems, [{ field: "gender" }]));
          expect(genders).toEqual([{ gender: "M" }, { gender: "F" }]);
        });
        test("Items with the same fields in another order are duplicates", () => {
          const result = distinctItems([
            { a: 1, b: 2 },
            { b: 2, a: 1 },
          ]);
          expect(result).toEqual([{ a: 1, b: 2 }]);
        });
        test("Dates and nested objects are compared by content", () => {
          const result = distinctItems([
            { on: new Date("2020-01-01T00:00:00.000Z"), tags: ["a"] },
            { on: new Date("2020-01-01T00:00:00.000Z"), tags: ["a"] },
            { on: new Date("2020-01-01T00:00:00.000Z"), tags: ["b"] },
          ]);
          expect(result).toHaveLength(2);
        });
        test("Values of different types are not duplicates", () => {
          expect(distinctItems([{ id: 1 }, { id: "1" }])).toHaveLength(2);
          expect(distinctItems([1, "1", 1, null, null, undefined] as List<unknown>)).toEqual([1, "1", null, undefined]);
        });
        test("A whole list without duplicates is returned as a copy", () => {
          const result = distinctItems(GenericItems);
          expect(result).toEqual(GenericItems);
          expect(result).not.toBe(GenericItems);
        });
      });
    });
  });
});
