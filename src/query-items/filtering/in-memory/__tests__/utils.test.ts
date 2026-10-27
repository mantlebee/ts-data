import { List } from "@mantlebee/ts-core";

import { Acme, GenericItem, GenericItems, Money, Product, Products } from "@test/fixtures";

import { toComparableValue } from "../../../in-memory/comparer";
import { InMemoryQueryOptions } from "../../../in-memory/types";
import { FilterLogics, FilterOperators } from "../../constants";
import { Filter, FiltersExpression, FiltersList, FilterValueOperators } from "../../types";
import { filterItems, matchesExpression, matchesFilter } from "../utils";

/** Ids of the items, in order: what every assertion compares. */
function ids(items: List<GenericItem>): List<number> {
  return items.map((a) => a.id);
}
/** A list of filters combined with `and`. */
function all<TItem = GenericItem>(...filters: List<Filter<TItem>>): FiltersList<TItem> {
  return { filters, logic: FilterLogics.and };
}

const UNMARRIED_IDS = [1, 4, 6, 9, 12, 15, 18, 21, 24];
const MEN_IDS = [1, 2, 3, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

describe("query-items", () => {
  describe("filtering", () => {
    describe("in-memory", () => {
      describe("filterItems", () => {
        test("Without an expression returns a copy of the list", () => {
          const result = filterItems(GenericItems);
          expect(result).toEqual(GenericItems);
          expect(result).not.toBe(GenericItems);
        });

        describe("operators", () => {
          test("equal", () => {
            const result = filterItems(GenericItems, all({ field: "lastName", operator: FilterOperators.equal, value: "Congue" }));
            expect(ids(result)).toEqual([2, 5, 16]);
          });
          test("equal ignores the case by default", () => {
            const result = filterItems(GenericItems, all({ field: "lastName", operator: FilterOperators.equal, value: "congue" }));
            expect(ids(result)).toEqual([2, 5, 16]);
          });
          test("equal honours the case when caseSensitive", () => {
            const result = filterItems(GenericItems, all({ field: "lastName", operator: FilterOperators.equal, value: "congue" }), { caseSensitive: true });
            expect(ids(result)).toEqual([]);
          });
          test("equal null matches the unset fields", () => {
            const result = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.equal, value: null }));
            expect(ids(result)).toEqual(UNMARRIED_IDS);
          });
          test("equal on booleans", () => {
            const result = filterItems(GenericItems, all({ field: "married", operator: FilterOperators.equal, value: false }));
            expect(ids(result)).toEqual(UNMARRIED_IDS);
          });
          test("notEqual", () => {
            const result = filterItems(GenericItems, all({ field: "gender", operator: FilterOperators.notEqual, value: "F" }));
            expect(ids(result)).toEqual(MEN_IDS);
          });
          test("notEqual null matches the set fields", () => {
            const result = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.notEqual, value: null }));
            expect(ids(result)).toEqual(GenericItems.filter((a) => a.married).map((a) => a.id));
          });
          test("equalInsensitive", () => {
            const result = filterItems(GenericItems, all({ field: "firstName", operator: FilterOperators.equalInsensitive, value: "LOREM" }));
            expect(ids(result)).toEqual([4]);
          });
          test("equalInsensitive on non-strings behaves like equal", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.equalInsensitive, value: 20 }));
            expect(ids(result)).toEqual([4]);
          });
          test("equalInsensitive ignores the case even when caseSensitive", () => {
            const result = filterItems(GenericItems, all({ field: "firstName", operator: FilterOperators.equalInsensitive, value: "LOREM" }), { caseSensitive: true });
            expect(ids(result)).toEqual([4]);
          });
          test("greaterThan", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.greaterThan, value: 61 }));
            expect(ids(result)).toEqual([8, 14]);
          });
          test("greaterThanOrEqual", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.greaterThanOrEqual, value: 61 }));
            expect(ids(result)).toEqual([8, 14, 20]);
          });
          test("lessThan", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.lessThan, value: 19 }));
            expect(ids(result)).toEqual([6, 12]);
          });
          test("lessThanOrEqual", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.lessThanOrEqual, value: 19 }));
            expect(ids(result)).toEqual([6, 12, 21]);
          });
          test("Ordered operators compare dates by time and skip the unset fields", () => {
            const since = new Date("2013-01-01T00:00:00.000Z");
            const after = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.greaterThan, value: since }));
            expect(ids(after)).toEqual([7, 16, 22]);
            const before = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.lessThan, value: since }));
            expect(ids(before)).toEqual([2, 3, 5, 8, 10, 11, 13, 14, 17, 19, 20, 23]);
          });
          test("Ordered operators never match a null value", () => {
            const operators: List<FilterValueOperators> = [FilterOperators.greaterThan, FilterOperators.greaterThanOrEqual, FilterOperators.lessThan, FilterOperators.lessThanOrEqual];
            for (const operator of operators) {
              const result = filterItems(GenericItems, all({ field: "marriedOn", operator, value: null }));
              expect(ids(result)).toEqual([]);
            }
          });
          test("range, limits included", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: 20 }, max: { exclude: false, value: 30 } } }));
            expect(ids(result)).toEqual([1, 4, 9, 15, 18, 24]);
          });
          test("range, minimum excluded", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.range, value: { min: { exclude: true, value: 20 }, max: { exclude: false, value: 30 } } }));
            expect(ids(result)).toEqual([1, 9, 15, 18, 24]);
          });
          test("range, maximum excluded", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: 20 }, max: { exclude: true, value: 30 } } }));
            expect(ids(result)).toEqual([4, 9, 15, 18, 24]);
          });
          test("range, both limits excluded", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.range, value: { min: { exclude: true, value: 20 }, max: { exclude: true, value: 30 } } }));
            expect(ids(result)).toEqual([9, 15, 18, 24]);
          });
          test("range, open on one side", () => {
            const fromSixty = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: 60 }, max: null } }));
            expect(ids(fromSixty)).toEqual([8, 14, 20]);
            const toSeventeen = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.range, value: { min: null, max: { exclude: false, value: 17 } } }));
            expect(ids(toSeventeen)).toEqual([6, 12]);
          });
          test("range on dates skips the unset fields", () => {
            const result = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.range, value: { min: { exclude: false, value: new Date("2010-01-01T00:00:00.000Z") }, max: { exclude: false, value: new Date("2013-12-31T00:00:00.000Z") } } }));
            expect(ids(result)).toEqual([5, 13, 16]);
          });
          test("range with null limit values is open on that side", () => {
            const result = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: null as never }, max: { exclude: false, value: 17 } } }));
            expect(ids(result)).toEqual([6, 12]);
          });
          test("in", () => {
            const result = filterItems(GenericItems, all({ field: "lastName", operator: FilterOperators.in, value: ["amet", "Nunc"] }));
            expect(ids(result)).toEqual([3, 7, 11, 17, 19, 24]);
          });
          test("in with null matches the unset fields", () => {
            const result = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.in, value: [null as never] }));
            expect(ids(result)).toEqual(UNMARRIED_IDS);
          });
          test("notIn", () => {
            const result = filterItems(GenericItems, all({ field: "lastName", operator: FilterOperators.notIn, value: ["Amet", "Nunc"] }));
            expect(ids(result)).toEqual(GenericItems.filter((a) => !["Amet", "Nunc"].includes(a.lastName)).map((a) => a.id));
          });
          test("contains on strings, ignoring the case", () => {
            const result = filterItems(GenericItems, all({ field: "email", operator: FilterOperators.contains, value: "ORNARE" }));
            expect(ids(result)).toEqual([10, 15, 23]);
          });
          test("contains honours the case when caseSensitive", () => {
            const result = filterItems(GenericItems, all({ field: "email", operator: FilterOperators.contains, value: "ORNARE" }), { caseSensitive: true });
            expect(ids(result)).toEqual([]);
          });
          test("contains on lists checks the membership", () => {
            const result = filterItems(Products, all<Product>({ field: "tags", operator: FilterOperators.contains, value: "fresh" as never }));
            expect(result.map((a) => a.id)).toEqual([1]);
          });
          test("contains never matches a null value", () => {
            const result = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.contains, value: "u" as never }));
            expect(ids(result)).toEqual([]);
          });
          test("notContains", () => {
            const result = filterItems(GenericItems, all({ field: "email", operator: FilterOperators.notContains, value: "ornare" }));
            expect(ids(result)).toEqual(GenericItems.filter((a) => a.lastName !== "Ornare").map((a) => a.id));
            const none = filterItems(GenericItems, all({ field: "email", operator: FilterOperators.notContains, value: "@example.com" }));
            expect(ids(none)).toEqual([]);
          });
          test("startsWith", () => {
            const result = filterItems(GenericItems, all({ field: "firstName", operator: FilterOperators.startsWith, value: "p" }));
            expect(ids(result)).toEqual([5, 11, 20, 22]);
          });
          test("startsWith on numbers compares their text", () => {
            const result = filterItems(GenericItems, all({ field: "id", operator: FilterOperators.startsWith, value: 2 }));
            expect(ids(result)).toEqual([2, 20, 21, 22, 23, 24]);
          });
          test("startsWith never matches a null value", () => {
            const result = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.startsWith, value: "n" as never }));
            expect(ids(result)).toEqual([]);
          });
          test("endsWith", () => {
            const result = filterItems(GenericItems, all({ field: "lastName", operator: FilterOperators.endsWith, value: "A" }));
            expect(ids(result)).toEqual([8, 12, 13, 20, 21]);
          });
          test("endsWith never matches a null value", () => {
            const result = filterItems(GenericItems, all({ field: "marriedOn", operator: FilterOperators.endsWith, value: "l" as never }));
            expect(ids(result)).toEqual([]);
          });
          test("Unknown operator throws", () => {
            expect(() => filterItems(GenericItems, all({ field: "id", operator: "like" as never, value: 1 }))).toThrow("Unknown filter operator: like");
          });
        });

        describe("expressions", () => {
          test("A list with 'or' matches any filter", () => {
            const result = filterItems(GenericItems, {
              filters: [
                { field: "age", operator: FilterOperators.greaterThan, value: 60 },
                { field: "age", operator: FilterOperators.lessThan, value: 18 },
              ],
              logic: FilterLogics.or,
            });
            expect(ids(result)).toEqual([6, 8, 12, 14, 20]);
          });
          test("A three-level expression is honoured recursively", () => {
            // (women aged 50 or more) or (unmarried and (Diam or under 18))
            const expression: FiltersExpression<GenericItem> = {
              groups: [
                {
                  filters: [
                    { field: "gender", operator: FilterOperators.equal, value: "F" },
                    { field: "age", operator: FilterOperators.greaterThanOrEqual, value: 50 },
                  ],
                  logic: FilterLogics.and,
                },
                {
                  groups: [
                    {
                      filters: [{ field: "married", operator: FilterOperators.equal, value: false }],
                      logic: FilterLogics.and,
                    },
                    {
                      groups: [
                        { filters: [{ field: "lastName", operator: FilterOperators.equal, value: "Diam" }], logic: FilterLogics.and },
                        { filters: [{ field: "age", operator: FilterOperators.lessThan, value: 18 }], logic: FilterLogics.and },
                      ],
                      logic: FilterLogics.or,
                    },
                  ],
                  logic: FilterLogics.and,
                },
              ],
              logic: FilterLogics.or,
            };
            const result = filterItems(GenericItems, expression);
            expect(ids(result)).toEqual([4, 6, 9, 11, 12, 17, 18, 23]);
          });
          test("An empty list or group matches every item, whatever the logic", () => {
            expect(filterItems(GenericItems, { filters: [], logic: FilterLogics.or })).toEqual(GenericItems);
            expect(filterItems(GenericItems, { groups: [], logic: FilterLogics.and })).toEqual(GenericItems);
          });
        });

        describe("comparable values", () => {
          test("Value objects are compared through valueOf", () => {
            const cheap = filterItems(Products, all<Product>({ field: "price", operator: FilterOperators.lessThan, value: new Money(1000) }));
            expect(cheap.map((a) => a.id)).toEqual([2, 3]);
          });
          test("A filter value may be the primitive of the value object", () => {
            const result = filterItems(Products, all<Product>({ field: "price", operator: FilterOperators.equal, value: 250 as never }));
            expect(result.map((a) => a.id)).toEqual([2]);
          });
          test("Objects without a primitive valueOf are compared by reference", () => {
            const result = filterItems(Products, all<Product>({ field: "supplier", operator: FilterOperators.equal, value: Acme }));
            expect(result.map((a) => a.id)).toEqual([1, 3]);
            const copy = filterItems(Products, all<Product>({ field: "supplier", operator: FilterOperators.equal, value: { name: "Acme" } }));
            expect(copy).toEqual([]);
          });
          test("toComparable overrides the rule per field, on both sides", () => {
            const options: InMemoryQueryOptions<GenericItem> = {
              toComparable: (value, field) =>
                field === "age" ? Math.floor((value as number) / 10) : toComparableValue(value),
            };
            const twenties = filterItems(GenericItems, all({ field: "age", operator: FilterOperators.equal, value: 25 }), options);
            expect(ids(twenties)).toEqual([4, 9, 15, 18, 24]);
            const names = filterItems(GenericItems, all({ field: "lastName", operator: FilterOperators.equal, value: "DIAM" }), options);
            expect(ids(names)).toEqual([4, 9, 18]);
          });
          test("Unset fields and null items compare as null", () => {
            const items = [{ name: "b" }, {}, null, undefined, { name: "a" }] as List<{ name?: string }>;
            const result = filterItems(items, all<{ name?: string }>({ field: "name", operator: FilterOperators.equal, value: null }));
            expect(result).toEqual([{}, null, undefined]);
          });
        });

        test("Neither the list nor its items are mutated", () => {
          const items = Object.freeze(GenericItems.map((a) => Object.freeze({ ...a })));
          const snapshot = JSON.stringify(items);
          const result = filterItems(items as List<GenericItem>, all({ field: "age", operator: FilterOperators.greaterThan, value: 60 }));
          expect(ids(result)).toEqual([8, 14, 20]);
          expect(JSON.stringify(items)).toBe(snapshot);
        });
      });

      describe("matchesExpression", () => {
        test("Tells whether one item satisfies the expression", () => {
          const expression: FiltersExpression<GenericItem> = {
            groups: [
              all<GenericItem>({ field: "gender", operator: FilterOperators.equal, value: "F" }),
              all<GenericItem>({ field: "age", operator: FilterOperators.greaterThan, value: 60 }),
            ],
            logic: FilterLogics.or,
          };
          expect(matchesExpression(GenericItems[3], expression)).toBe(true);
          expect(matchesExpression(GenericItems[7], expression)).toBe(true);
          expect(matchesExpression(GenericItems[0], expression)).toBe(false);
        });
        test("Honours the options", () => {
          const expression = all<GenericItem>({ field: "lastName", operator: FilterOperators.equal, value: "diam" });
          expect(matchesExpression(GenericItems[3], expression)).toBe(true);
          expect(matchesExpression(GenericItems[3], expression, { caseSensitive: true })).toBe(false);
        });
      });

      describe("matchesFilter", () => {
        test("Tells whether one item satisfies the filter", () => {
          const filter: Filter<GenericItem> = { field: "age", operator: FilterOperators.greaterThan, value: 60 };
          expect(matchesFilter(GenericItems[7], filter)).toBe(true);
          expect(matchesFilter(GenericItems[0], filter)).toBe(false);
        });
        test("Honours the options", () => {
          const filter: Filter<GenericItem> = { field: "lastName", operator: FilterOperators.startsWith, value: "d" };
          expect(matchesFilter(GenericItems[3], filter)).toBe(true);
          expect(matchesFilter(GenericItems[3], filter, { caseSensitive: true })).toBe(false);
        });
      });
    });
  });
});
