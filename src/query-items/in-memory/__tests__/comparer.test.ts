import { Acme, Money } from "@test/fixtures";

import { createComparer, toComparableValue } from "../comparer";

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
        expect(toComparableValue(Acme)).toBe(Acme);
        const list = [1, 2];
        expect(toComparableValue(list)).toBe(list);
        const bare = Object.create(null);
        expect(toComparableValue(bare)).toBe(bare);
      });
    });

    describe("createComparer", () => {
      test("Without options it is toComparableValue, ignoring the case", () => {
        const compare = createComparer();
        expect(compare("AbC", "name")).toBe("abc");
        expect(compare(undefined, "name")).toBeNull();
      });
      test("caseSensitive keeps the case", () => {
        const compare = createComparer({ caseSensitive: true });
        expect(compare("AbC", "name")).toBe("AbC");
      });
      test("toComparable replaces the rule", () => {
        const toComparable = jest.fn((value: unknown) => String(value).length);
        const compare = createComparer<{ name: string }>({ caseSensitive: true, toComparable });
        expect(compare("AbC", "name")).toBe(3);
        expect(toComparable).toHaveBeenCalledWith("AbC", "name");
      });
    });
  });
});
