import { List } from "@mantlebee/ts-core";

import { GenericItem, GenericItems, Products } from "@test/fixtures";

import { toComparableValue } from "../../../in-memory/comparer";
import { Sort } from "../../types";
import { sortItems } from "../utils";

/** Ids of the items, in order: what every assertion compares. */
function ids(items: List<GenericItem>): List<number> {
  return items.map((a) => a.id);
}

const UNMARRIED_IDS = [1, 4, 6, 9, 12, 15, 18, 21, 24];
const MEN_IDS = [1, 2, 3, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const WOMEN_IDS = [4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

describe("query-items", () => {
  describe("sorting", () => {
    describe("in-memory", () => {
      describe("sortItems", () => {
        test("Without sorts returns a copy of the list", () => {
          const none = sortItems(GenericItems);
          expect(none).toEqual(GenericItems);
          expect(none).not.toBe(GenericItems);
          const empty = sortItems(GenericItems, []);
          expect(empty).toEqual(GenericItems);
          expect(empty).not.toBe(GenericItems);
        });
        test("Ascending by one field, stable for equal values", () => {
          const result = sortItems(GenericItems, [{ asc: true, field: "gender" }]);
          expect(ids(result)).toEqual([...WOMEN_IDS, ...MEN_IDS]);
        });
        test("Two fields, in the order of the sorts", () => {
          const sorts: List<Sort<GenericItem>> = [
            { asc: true, field: "lastName" },
            { asc: false, field: "age" },
          ];
          const result = sortItems(GenericItems, sorts);
          expect(ids(result)).toEqual([11, 3, 19, 2, 5, 16, 1, 18, 9, 4, 8, 13, 21, 20, 12, 17, 7, 24, 23, 10, 15, 14, 22, 6]);
        });
        test("Unset values first when ascending, last when descending", () => {
          const byDate = [14, 8, 20, 11, 23, 3, 17, 2, 10, 19, 5, 13, 16, 7, 22];
          const asc = sortItems(GenericItems, [{ asc: true, field: "marriedOn" }]);
          expect(ids(asc)).toEqual([...UNMARRIED_IDS, ...byDate]);
          const desc = sortItems(GenericItems, [{ asc: false, field: "marriedOn" }]);
          expect(ids(desc)).toEqual([...byDate.slice().reverse(), ...UNMARRIED_IDS]);
        });
        test("Strings are ordered ignoring the case by default", () => {
          const items = [{ name: "b" }, { name: "a" }, { name: "C" }];
          const insensitive = sortItems(items, [{ asc: true, field: "name" }]);
          expect(insensitive.map((a) => a.name)).toEqual(["a", "b", "C"]);
          const sensitive = sortItems(items, [{ asc: true, field: "name" }], { caseSensitive: true });
          expect(sensitive.map((a) => a.name)).toEqual(["C", "a", "b"]);
        });
        test("Values neither lower nor greater keep their order", () => {
          const items = [{ id: 1, value: NaN }, { id: 2, value: NaN }];
          const result = sortItems(items, [{ asc: true, field: "value" }]);
          expect(result.map((a) => a.id)).toEqual([1, 2]);
        });
        test("Value objects are ordered through valueOf", () => {
          const byPrice = sortItems(Products, [{ asc: true, field: "price" }]);
          expect(byPrice.map((a) => a.id)).toEqual([2, 3, 1]);
        });
        test("toComparable overrides the rule per field", () => {
          const result = sortItems(GenericItems, [{ asc: true, field: "age" }, { asc: false, field: "id" }], {
            toComparable: (value, field) =>
              field === "age" ? Math.floor((value as number) / 10) : toComparableValue(value),
          });
          // Ages by decade, then by id descending inside a decade.
          expect(ids(result).slice(0, 5)).toEqual([21, 12, 6, 24, 18]);
        });
        test("Unset fields and null items compare as null", () => {
          const items = [{ name: "b" }, {}, null, undefined, { name: "a" }] as List<{ name?: string }>;
          const result = sortItems(items, [{ asc: true, field: "name" }]);
          expect(result).toEqual([{}, null, undefined, { name: "a" }, { name: "b" }]);
        });
        test("Neither the list nor its items are mutated", () => {
          const items = Object.freeze(GenericItems.map((a) => Object.freeze({ ...a })));
          const snapshot = JSON.stringify(items);
          const result = sortItems(items as List<GenericItem>, [{ asc: false, field: "age" }]);
          expect(ids(result).slice(0, 3)).toEqual([14, 8, 20]);
          expect(JSON.stringify(items)).toBe(snapshot);
        });
      });
    });
  });
});
