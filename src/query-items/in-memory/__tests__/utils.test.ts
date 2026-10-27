import { List } from "@mantlebee/ts-core";

import {
  DataSource,
  FilterExtension,
  PaginationExtension,
  SortExtension,
} from "@/data-source";
import { GenericItem, GenericItems } from "@test/fixtures";

import { FilterLogics, FilterOperators } from "../../filtering/constants";
import { Filter, FiltersExpression, FilterValueOperators } from "../../filtering/types";
import { Paging } from "../../pagination/types";
import { Sort } from "../../sorting/types";
import { QueryItemsPayload } from "../../types";
import { InMemoryQueryOptions } from "../types";
import {
  countItems,
  createInMemoryReader,
  queryItems,
  toComparableValue,
} from "../utils";

/** Ids of the items, in order: what every assertion compares. */
function ids(items: List<GenericItem>): List<number> {
  return items.map((a) => a.id);
}
/** A payload with a single filter. */
function where<TItem = GenericItem>(...filters: List<Filter<TItem>>): QueryItemsPayload<TItem> {
  return { filters: { filters, logic: FilterLogics.and } };
}
function paging(page: number, itemsPerPage: number): Paging {
  return { itemsPerPage, page, totalItemsCount: 0 };
}

const UNMARRIED_IDS = [1, 4, 6, 9, 12, 15, 18, 21, 24];
const MEN_IDS = [1, 2, 3, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
const WOMEN_IDS = [4, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];

/** Value object of a consumer: compared through `valueOf`. */
class Money {
  public constructor(public readonly cents: number) {}
  public valueOf(): number {
    return this.cents;
  }
}
type Product = {
  id: number;
  price: Money;
  /** An object without a primitive `valueOf`: compared by reference. */
  supplier: { name: string };
  tags: List<string>;
};
const acme = { name: "Acme" };
const globex = { name: "Globex" };
const products: List<Product> = [
  { id: 1, price: new Money(1500), supplier: acme, tags: ["Food", "Fresh"] },
  { id: 2, price: new Money(250), supplier: globex, tags: ["Tools"] },
  { id: 3, price: new Money(999), supplier: acme, tags: [] },
];

describe("query-items", () => {
  describe("in-memory", () => {
    describe("toComparableValue", () => {
      test("null and undefined become null", () => {
        expect(toComparableValue(null)).toBeNull();
        expect(toComparableValue(undefined)).toBeNull();
      });
      test("Numbers and booleans stay as they are", () => {
        expect(toComparableValue(42)).toBe(42);
        expect(toComparableValue(true)).toBe(true);
      });
      test("Strings are lower-cased unless case sensitive", () => {
        expect(toComparableValue("AbC")).toBe("abc");
        expect(toComparableValue("AbC", true)).toBe("AbC");
      });
      test("Dates become their time", () => {
        const date = new Date("2020-01-02T03:04:05.000Z");
        expect(toComparableValue(date)).toBe(date.getTime());
      });
      test("Objects with a primitive valueOf become that primitive, converted too", () => {
        expect(toComparableValue(new Money(250))).toBe(250);
        expect(toComparableValue({ valueOf: () => "AbC" })).toBe("abc");
      });
      test("Objects without a primitive valueOf stay as they are", () => {
        expect(toComparableValue(acme)).toBe(acme);
        const list = [1, 2];
        expect(toComparableValue(list)).toBe(list);
        const bare = Object.create(null);
        expect(toComparableValue(bare)).toBe(bare);
      });
    });

    describe("queryItems", () => {
      describe("without query", () => {
        test("Returns a copy of the list", () => {
          const result = queryItems(GenericItems, {});
          expect(result).toEqual(GenericItems);
          expect(result).not.toBe(GenericItems);
        });
      });

      describe("filters", () => {
        test("equal", () => {
          const result = queryItems(GenericItems, where({ field: "lastName", operator: FilterOperators.equal, value: "Congue" }));
          expect(ids(result)).toEqual([2, 5, 16]);
        });
        test("equal ignores the case by default", () => {
          const result = queryItems(GenericItems, where({ field: "lastName", operator: FilterOperators.equal, value: "congue" }));
          expect(ids(result)).toEqual([2, 5, 16]);
        });
        test("equal honours the case when caseSensitive", () => {
          const result = queryItems(GenericItems, where({ field: "lastName", operator: FilterOperators.equal, value: "congue" }), { caseSensitive: true });
          expect(ids(result)).toEqual([]);
        });
        test("equal null matches the unset fields", () => {
          const result = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.equal, value: null }));
          expect(ids(result)).toEqual(UNMARRIED_IDS);
        });
        test("equal on booleans", () => {
          const result = queryItems(GenericItems, where({ field: "married", operator: FilterOperators.equal, value: false }));
          expect(ids(result)).toEqual(UNMARRIED_IDS);
        });
        test("notEqual", () => {
          const result = queryItems(GenericItems, where({ field: "gender", operator: FilterOperators.notEqual, value: "F" }));
          expect(ids(result)).toEqual(MEN_IDS);
        });
        test("notEqual null matches the set fields", () => {
          const result = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.notEqual, value: null }));
          expect(ids(result)).toEqual(GenericItems.filter((a) => a.married).map((a) => a.id));
        });
        test("equalInsensitive", () => {
          const result = queryItems(GenericItems, where({ field: "firstName", operator: FilterOperators.equalInsensitive, value: "LOREM" }));
          expect(ids(result)).toEqual([4]);
        });
        test("equalInsensitive on non-strings behaves like equal", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.equalInsensitive, value: 20 }));
          expect(ids(result)).toEqual([4]);
        });
        test("equalInsensitive ignores the case even when caseSensitive", () => {
          const result = queryItems(GenericItems, where({ field: "firstName", operator: FilterOperators.equalInsensitive, value: "LOREM" }), { caseSensitive: true });
          expect(ids(result)).toEqual([4]);
        });
        test("greaterThan", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.greaterThan, value: 61 }));
          expect(ids(result)).toEqual([8, 14]);
        });
        test("greaterThanOrEqual", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.greaterThanOrEqual, value: 61 }));
          expect(ids(result)).toEqual([8, 14, 20]);
        });
        test("lessThan", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.lessThan, value: 19 }));
          expect(ids(result)).toEqual([6, 12]);
        });
        test("lessThanOrEqual", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.lessThanOrEqual, value: 19 }));
          expect(ids(result)).toEqual([6, 12, 21]);
        });
        test("Ordered operators compare dates by time and skip the unset fields", () => {
          const since = new Date("2013-01-01T00:00:00.000Z");
          const after = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.greaterThan, value: since }));
          expect(ids(after)).toEqual([7, 16, 22]);
          const before = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.lessThan, value: since }));
          expect(ids(before)).toEqual([2, 3, 5, 8, 10, 11, 13, 14, 17, 19, 20, 23]);
        });
        test("Ordered operators never match a null value", () => {
          const operators: List<FilterValueOperators> = [FilterOperators.greaterThan, FilterOperators.greaterThanOrEqual, FilterOperators.lessThan, FilterOperators.lessThanOrEqual];
          for (const operator of operators) {
            const result = queryItems(GenericItems, where({ field: "marriedOn", operator, value: null }));
            expect(ids(result)).toEqual([]);
          }
        });
        test("range, limits included", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: 20 }, max: { exclude: false, value: 30 } } }));
          expect(ids(result)).toEqual([1, 4, 9, 15, 18, 24]);
        });
        test("range, minimum excluded", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.range, value: { min: { exclude: true, value: 20 }, max: { exclude: false, value: 30 } } }));
          expect(ids(result)).toEqual([1, 9, 15, 18, 24]);
        });
        test("range, maximum excluded", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: 20 }, max: { exclude: true, value: 30 } } }));
          expect(ids(result)).toEqual([4, 9, 15, 18, 24]);
        });
        test("range, both limits excluded", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.range, value: { min: { exclude: true, value: 20 }, max: { exclude: true, value: 30 } } }));
          expect(ids(result)).toEqual([9, 15, 18, 24]);
        });
        test("range, open on one side", () => {
          const fromSixty = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: 60 }, max: null } }));
          expect(ids(fromSixty)).toEqual([8, 14, 20]);
          const toSeventeen = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.range, value: { min: null, max: { exclude: false, value: 17 } } }));
          expect(ids(toSeventeen)).toEqual([6, 12]);
        });
        test("range on dates skips the unset fields", () => {
          const result = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.range, value: { min: { exclude: false, value: new Date("2010-01-01T00:00:00.000Z") }, max: { exclude: false, value: new Date("2013-12-31T00:00:00.000Z") } } }));
          expect(ids(result)).toEqual([5, 13, 16]);
        });
        test("range with null limit values is open on that side", () => {
          const result = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.range, value: { min: { exclude: false, value: null as never }, max: { exclude: false, value: 17 } } }));
          expect(ids(result)).toEqual([6, 12]);
        });
        test("in", () => {
          const result = queryItems(GenericItems, where({ field: "lastName", operator: FilterOperators.in, value: ["amet", "Nunc"] }));
          expect(ids(result)).toEqual([3, 7, 11, 17, 19, 24]);
        });
        test("in with null matches the unset fields", () => {
          const result = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.in, value: [null as never] }));
          expect(ids(result)).toEqual(UNMARRIED_IDS);
        });
        test("notIn", () => {
          const result = queryItems(GenericItems, where({ field: "lastName", operator: FilterOperators.notIn, value: ["Amet", "Nunc"] }));
          expect(ids(result)).toEqual(GenericItems.filter((a) => !["Amet", "Nunc"].includes(a.lastName)).map((a) => a.id));
        });
        test("contains on strings, ignoring the case", () => {
          const result = queryItems(GenericItems, where({ field: "email", operator: FilterOperators.contains, value: "ORNARE" }));
          expect(ids(result)).toEqual([10, 15, 23]);
        });
        test("contains honours the case when caseSensitive", () => {
          const result = queryItems(GenericItems, where({ field: "email", operator: FilterOperators.contains, value: "ORNARE" }), { caseSensitive: true });
          expect(ids(result)).toEqual([]);
        });
        test("contains on lists checks the membership", () => {
          const result = queryItems(products, where<Product>({ field: "tags", operator: FilterOperators.contains, value: "fresh" as never }));
          expect(result.map((a) => a.id)).toEqual([1]);
        });
        test("contains never matches a null value", () => {
          const result = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.contains, value: "u" as never }));
          expect(ids(result)).toEqual([]);
        });
        test("notContains", () => {
          const result = queryItems(GenericItems, where({ field: "email", operator: FilterOperators.notContains, value: "ornare" }));
          expect(ids(result)).toEqual(GenericItems.filter((a) => a.lastName !== "Ornare").map((a) => a.id));
          const none = queryItems(GenericItems, where({ field: "email", operator: FilterOperators.notContains, value: "@example.com" }));
          expect(ids(none)).toEqual([]);
        });
        test("startsWith", () => {
          const result = queryItems(GenericItems, where({ field: "firstName", operator: FilterOperators.startsWith, value: "p" }));
          expect(ids(result)).toEqual([5, 11, 20, 22]);
        });
        test("startsWith on numbers compares their text", () => {
          const result = queryItems(GenericItems, where({ field: "id", operator: FilterOperators.startsWith, value: 2 }));
          expect(ids(result)).toEqual([2, 20, 21, 22, 23, 24]);
        });
        test("startsWith never matches a null value", () => {
          const result = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.startsWith, value: "n" as never }));
          expect(ids(result)).toEqual([]);
        });
        test("endsWith", () => {
          const result = queryItems(GenericItems, where({ field: "lastName", operator: FilterOperators.endsWith, value: "A" }));
          expect(ids(result)).toEqual([8, 12, 13, 20, 21]);
        });
        test("endsWith never matches a null value", () => {
          const result = queryItems(GenericItems, where({ field: "marriedOn", operator: FilterOperators.endsWith, value: "l" as never }));
          expect(ids(result)).toEqual([]);
        });
        test("Unknown operator throws", () => {
          expect(() => queryItems(GenericItems, where({ field: "id", operator: "like" as never, value: 1 }))).toThrow("Unknown filter operator: like");
        });
      });

      describe("expressions", () => {
        test("A list with 'or' matches any filter", () => {
          const result = queryItems(GenericItems, {
            filters: {
              filters: [
                { field: "age", operator: FilterOperators.greaterThan, value: 60 },
                { field: "age", operator: FilterOperators.lessThan, value: 18 },
              ],
              logic: FilterLogics.or,
            },
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
          const result = queryItems(GenericItems, { filters: expression });
          expect(ids(result)).toEqual([4, 6, 9, 11, 12, 17, 18, 23]);
        });
        test("An empty list or group matches every item, whatever the logic", () => {
          expect(queryItems(GenericItems, { filters: { filters: [], logic: FilterLogics.or } })).toEqual(GenericItems);
          expect(queryItems(GenericItems, { filters: { groups: [], logic: FilterLogics.and } })).toEqual(GenericItems);
        });
      });

      describe("sorts", () => {
        test("Ascending by one field, stable for equal values", () => {
          const result = queryItems(GenericItems, { sorts: [{ asc: true, field: "gender" }] });
          expect(ids(result)).toEqual([...WOMEN_IDS, ...MEN_IDS]);
        });
        test("Two fields, in the order of the sorts", () => {
          const sorts: List<Sort<GenericItem>> = [
            { asc: true, field: "lastName" },
            { asc: false, field: "age" },
          ];
          const result = queryItems(GenericItems, { sorts });
          expect(ids(result)).toEqual([11, 3, 19, 2, 5, 16, 1, 18, 9, 4, 8, 13, 21, 20, 12, 17, 7, 24, 23, 10, 15, 14, 22, 6]);
        });
        test("Unset values first when ascending, last when descending", () => {
          const byDate = [14, 8, 20, 11, 23, 3, 17, 2, 10, 19, 5, 13, 16, 7, 22];
          const asc = queryItems(GenericItems, { sorts: [{ asc: true, field: "marriedOn" }] });
          expect(ids(asc)).toEqual([...UNMARRIED_IDS, ...byDate]);
          const desc = queryItems(GenericItems, { sorts: [{ asc: false, field: "marriedOn" }] });
          expect(ids(desc)).toEqual([...byDate.slice().reverse(), ...UNMARRIED_IDS]);
        });
        test("Strings are ordered ignoring the case by default", () => {
          const items = [{ name: "b" }, { name: "a" }, { name: "C" }];
          const insensitive = queryItems(items, { sorts: [{ asc: true, field: "name" }] });
          expect(insensitive.map((a) => a.name)).toEqual(["a", "b", "C"]);
          const sensitive = queryItems(items, { sorts: [{ asc: true, field: "name" }] }, { caseSensitive: true });
          expect(sensitive.map((a) => a.name)).toEqual(["C", "a", "b"]);
        });
        test("Values neither lower nor greater keep their order", () => {
          const items = [{ id: 1, value: NaN }, { id: 2, value: NaN }];
          const result = queryItems(items, { sorts: [{ asc: true, field: "value" }] });
          expect(result.map((a) => a.id)).toEqual([1, 2]);
        });
        test("An empty list of sorts keeps the order", () => {
          const result = queryItems(GenericItems, { sorts: [] });
          expect(result).toEqual(GenericItems);
        });
      });

      describe("paging", () => {
        test("Returns the requested page, pages are 1-based", () => {
          expect(ids(queryItems(GenericItems, { paging: paging(1, 10) }))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
          expect(ids(queryItems(GenericItems, { paging: paging(3, 10) }))).toEqual([21, 22, 23, 24]);
        });
        test("A page beyond the last one is empty", () => {
          expect(queryItems(GenericItems, { paging: paging(4, 10) })).toEqual([]);
        });
        test("A page lower than 1 is read as the first one", () => {
          expect(ids(queryItems(GenericItems, { paging: paging(0, 5) }))).toEqual([1, 2, 3, 4, 5]);
        });
        test("Paging applies after filtering and sorting", () => {
          const result = queryItems(GenericItems, {
            ...where({ field: "gender", operator: FilterOperators.equal, value: "F" }),
            paging: paging(2, 5),
            sorts: [{ asc: false, field: "age" }],
          });
          expect(ids(result)).toEqual([13, 7, 9, 15, 4]);
        });
      });

      describe("comparable values", () => {
        test("Value objects are compared through valueOf", () => {
          const cheap = queryItems(products, where<Product>({ field: "price", operator: FilterOperators.lessThan, value: new Money(1000) }));
          expect(cheap.map((a) => a.id)).toEqual([2, 3]);
          const byPrice = queryItems(products, { sorts: [{ asc: true, field: "price" }] });
          expect(byPrice.map((a) => a.id)).toEqual([2, 3, 1]);
        });
        test("A filter value may be the primitive of the value object", () => {
          const result = queryItems(products, where<Product>({ field: "price", operator: FilterOperators.equal, value: 250 as never }));
          expect(result.map((a) => a.id)).toEqual([2]);
        });
        test("Objects without a primitive valueOf are compared by reference", () => {
          const result = queryItems(products, where<Product>({ field: "supplier", operator: FilterOperators.equal, value: acme }));
          expect(result.map((a) => a.id)).toEqual([1, 3]);
          const copy = queryItems(products, where<Product>({ field: "supplier", operator: FilterOperators.equal, value: { name: "Acme" } }));
          expect(copy).toEqual([]);
        });
        test("toComparable overrides the rule per field, on both sides", () => {
          const options: InMemoryQueryOptions<GenericItem> = {
            toComparable: (value, field) =>
              field === "age" ? Math.floor((value as number) / 10) : toComparableValue(value),
          };
          const twenties = queryItems(GenericItems, where({ field: "age", operator: FilterOperators.equal, value: 25 }), options);
          expect(ids(twenties)).toEqual([4, 9, 15, 18, 24]);
          const names = queryItems(GenericItems, where({ field: "lastName", operator: FilterOperators.equal, value: "DIAM" }), options);
          expect(ids(names)).toEqual([4, 9, 18]);
        });
        test("Unset fields and null items compare as null", () => {
          const items = [{ name: "b" }, {}, null, undefined, { name: "a" }] as List<{ name?: string }>;
          const result = queryItems(items, { sorts: [{ asc: true, field: "name" }] });
          expect(result).toEqual([{}, null, undefined, { name: "a" }, { name: "b" }]);
        });
      });

      describe("immutability", () => {
        test("Neither the list nor its items are mutated", () => {
          const items = Object.freeze(GenericItems.map((a) => Object.freeze({ ...a })));
          const snapshot = JSON.stringify(items);
          const result = queryItems(items as List<GenericItem>, {
            ...where({ field: "age", operator: FilterOperators.greaterThan, value: 30 }),
            paging: paging(1, 3),
            sorts: [{ asc: false, field: "age" }],
          });
          expect(ids(result)).toEqual([14, 8, 20]);
          expect(JSON.stringify(items)).toBe(snapshot);
        });
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
        const payload = where<GenericItem>({ field: "lastName", operator: FilterOperators.equal, value: "diam" });
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
    });
  });
});
