import { List, Nullable } from "@mantlebee/ts-core";

import { toComparableValue } from "../../../in-memory/comparer";
import { InMemoryNullSemantics } from "../../../in-memory/types";
import {
  countItems,
  createInMemoryQueryItemsReader,
  queryItems,
} from "../../../in-memory/utils";
import { FilterLogics, FilterOperators } from "../../constants";
import { Filter, FiltersList } from "../../types";
import { filterItems, itemMatchesFilter } from "../utils";

type Item = { id: number; value?: Nullable<string> };

/** A list of filters combined with `and`. */
function all(...filters: List<Filter<Item>>): FiltersList<Item> {
  return { filters, logic: FilterLogics.and };
}
function filter(
  operator: Filter<Item>["operator"],
  value: unknown,
): Filter<Item> {
  return { field: "value", operator, value } as Filter<Item>;
}

/**
 * The rows of the table in the README (In-memory data): how a filter matches
 * an unset field (`null`, `undefined` or missing) with each semantics.
 */
const UNSET_FIELD_ROWS: List<
  [label: string, filter: Filter<Item>, javascript: boolean, sql: boolean]
> = [
  ["equal null", filter(FilterOperators.equal, null), true, true],
  ["equal a", filter(FilterOperators.equal, "a"), false, false],
  [
    "equalInsensitive null",
    filter(FilterOperators.equalInsensitive, null),
    true,
    true,
  ],
  [
    "equalInsensitive a",
    filter(FilterOperators.equalInsensitive, "a"),
    false,
    false,
  ],
  ["notEqual a", filter(FilterOperators.notEqual, "a"), true, false],
  ["notEqual null", filter(FilterOperators.notEqual, null), false, false],
  ["in [a, null]", filter(FilterOperators.in, ["a", null]), true, true],
  ["in [a]", filter(FilterOperators.in, ["a"]), false, false],
  ["in []", filter(FilterOperators.in, []), false, false],
  ["notIn [a]", filter(FilterOperators.notIn, ["a"]), true, false],
  ["notIn []", filter(FilterOperators.notIn, []), true, false],
  ["notIn [a, null]", filter(FilterOperators.notIn, ["a", null]), false, false],
  ["contains a", filter(FilterOperators.contains, "a"), false, false],
  ["notContains a", filter(FilterOperators.notContains, "a"), true, false],
  ["startsWith a", filter(FilterOperators.startsWith, "a"), false, false],
  ["endsWith a", filter(FilterOperators.endsWith, "a"), false, false],
  ["greaterThan a", filter(FilterOperators.greaterThan, "a"), false, false],
  [
    "greaterThanOrEqual a",
    filter(FilterOperators.greaterThanOrEqual, "a"),
    false,
    false,
  ],
  ["lessThan a", filter(FilterOperators.lessThan, "a"), false, false],
  [
    "lessThanOrEqual a",
    filter(FilterOperators.lessThanOrEqual, "a"),
    false,
    false,
  ],
  [
    "range [a, z]",
    filter(FilterOperators.range, {
      max: { exclude: false, value: "z" },
      min: { exclude: false, value: "a" },
    }),
    false,
    false,
  ],
  ["range open", filter(FilterOperators.range, {}), false, false],
];

/** The same filters on a set field: the semantics never changes them. */
const SET_FIELD_ROWS: List<
  [label: string, filter: Filter<Item>, expected: boolean]
> = [
  ["equal null", filter(FilterOperators.equal, null), false],
  ["notEqual null", filter(FilterOperators.notEqual, null), true],
  ["notEqual a", filter(FilterOperators.notEqual, "a"), true],
  ["notEqual b", filter(FilterOperators.notEqual, "b"), false],
  ["in [a, null]", filter(FilterOperators.in, ["a", null]), false],
  ["notIn [a]", filter(FilterOperators.notIn, ["a"]), true],
  ["notIn [a, null]", filter(FilterOperators.notIn, ["a", null]), true],
  ["notIn [b]", filter(FilterOperators.notIn, ["b"]), false],
  ["notContains a", filter(FilterOperators.notContains, "a"), true],
  ["notContains b", filter(FilterOperators.notContains, "b"), false],
  ["notContains null", filter(FilterOperators.notContains, null), true],
  ["greaterThan a", filter(FilterOperators.greaterThan, "a"), true],
];

const UNSET_ITEMS: List<[label: string, item: Item]> = [
  ["null", { id: 1, value: null }],
  ["undefined", { id: 2, value: undefined }],
  ["missing", { id: 3 }],
];
const SET_ITEM: Item = { id: 4, value: "b" };

describe("query-items", () => {
  describe("filtering", () => {
    describe("in-memory", () => {
      describe("nullSemantics", () => {
        describe.each(UNSET_ITEMS)("Unset field (%s)", (_, item) => {
          test.each(UNSET_FIELD_ROWS)(
            "%s: javascript %s, sql %s",
            (_label, rowFilter, javascript, sql) => {
              expect(itemMatchesFilter(item, rowFilter)).toBe(javascript);
              expect(
                itemMatchesFilter(item, rowFilter, {
                  nullSemantics: "javascript",
                }),
              ).toBe(javascript);
              expect(
                itemMatchesFilter(item, rowFilter, { nullSemantics: "sql" }),
              ).toBe(sql);
            },
          );
        });

        describe("Set field", () => {
          test.each(SET_FIELD_ROWS)(
            "%s: %s with both",
            (_, rowFilter, expected) => {
              const semantics: List<InMemoryNullSemantics> = [
                "javascript",
                "sql",
              ];
              for (const nullSemantics of semantics)
                expect(
                  itemMatchesFilter(SET_ITEM, rowFilter, { nullSemantics }),
                ).toBe(expected);
            },
          );
        });

        test("A value the comparer turns into null is unset", () => {
          const item: Item = { id: 5, value: "n/a" };
          const toComparable = (value: unknown) =>
            value === "n/a" ? null : toComparableValue(value);
          const notA = filter(FilterOperators.notEqual, "a");
          expect(itemMatchesFilter(item, notA, { toComparable })).toBe(true);
          expect(
            itemMatchesFilter(item, notA, {
              nullSemantics: "sql",
              toComparable,
            }),
          ).toBe(false);
        });

        test("Unset list fields are dropped by notContains", () => {
          type Tagged = { id: number; tags: Nullable<List<string>> };
          const items: List<Tagged> = [
            { id: 1, tags: ["a"] },
            { id: 2, tags: ["b"] },
            { id: 3, tags: null },
          ];
          const notA: FiltersList<Tagged> = {
            filters: [
              {
                field: "tags",
                operator: FilterOperators.notContains,
                value: "a" as never,
              },
            ],
            logic: FilterLogics.and,
          };
          expect(filterItems(items, notA).map((a) => a.id)).toEqual([2, 3]);
          expect(
            filterItems(items, notA, { nullSemantics: "sql" }).map((a) => a.id),
          ).toEqual([2]);
        });

        describe("Through the readers", () => {
          const items: List<Item> = [
            { id: 1, value: "a" },
            { id: 2, value: "b" },
            { id: 3, value: null },
            { id: 4 },
          ];
          const notA = all(filter(FilterOperators.notEqual, "a"));

          test("filterItems", () => {
            expect(filterItems(items, notA).map((a) => a.id)).toEqual([
              2, 3, 4,
            ]);
            expect(
              filterItems(items, notA, { nullSemantics: "sql" }).map(
                (a) => a.id,
              ),
            ).toEqual([2]);
          });

          test("queryItems and countItems agree", () => {
            const payload = { filters: notA };
            expect(queryItems(items, payload).map((a) => a.id)).toEqual([
              2, 3, 4,
            ]);
            expect(countItems(items, payload)).toBe(3);
            const options = { nullSemantics: "sql" } as const;
            expect(
              queryItems(items, payload, options).map((a) => a.id),
            ).toEqual([2]);
            expect(countItems(items, payload, options)).toBe(1);
          });

          test("createInMemoryQueryItemsReader", async () => {
            const { countReader, reader } = createInMemoryQueryItemsReader(
              () => items,
              { nullSemantics: "sql" },
            );
            const payload = { filters: notA };
            expect((await reader(payload)).map((a) => a.id)).toEqual([2]);
            expect(await countReader(payload)).toBe(1);
          });

          test("An `or` of notEqual and equal null keeps the unset fields", () => {
            const notAOrUnset: FiltersList<Item> = {
              filters: [
                filter(FilterOperators.notEqual, "a"),
                filter(FilterOperators.equal, null),
              ],
              logic: FilterLogics.or,
            };
            expect(
              filterItems(items, notAOrUnset, { nullSemantics: "sql" }).map(
                (a) => a.id,
              ),
            ).toEqual([2, 3, 4]);
          });
        });
      });
    });
  });
});
