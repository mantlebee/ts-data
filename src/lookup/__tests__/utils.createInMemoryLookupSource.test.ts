import { AbortedException } from "@mantlebee/ts-core";

import { GenericItem, GenericItems } from "@test/fixtures";

import { createInMemoryLookupSource } from "../utils";

const ids = (items: GenericItem[]): number[] => items.map((item) => item.id);
const options = { textField: "lastName", valueField: "id" } as const;

describe("createInMemoryLookupSource", () => {
  describe("search", () => {
    test("Pages the items whose text contains the query, in the order of the list, and tells whether more follow", async () => {
      // "Amet": items 3, 11 and 19.
      const source = createInMemoryLookupSource(GenericItems, options);
      const first = await source.search("ame", { limit: 2, offset: 0 });
      expect(ids(first.items)).toEqual([3, 11]);
      expect(first.hasMore).toBe(true);
      const second = await source.search("ame", { limit: 2, offset: 2 });
      expect(ids(second.items)).toEqual([19]);
      expect(second.hasMore).toBe(false);
    });
    test("An empty query pages every item; a total that is a multiple of the limit costs one empty page", async () => {
      const source = createInMemoryLookupSource(GenericItems, options);
      const third = await source.search("", { limit: 8, offset: 16 });
      expect(ids(third.items)).toEqual([17, 18, 19, 20, 21, 22, 23, 24]);
      expect(third.hasMore).toBe(true);
      const fourth = await source.search("", { limit: 8, offset: 24 });
      expect(fourth).toEqual({ hasMore: false, items: [] });
    });
    test("Compares the text ignoring the case by default, respecting it with `caseSensitive`", async () => {
      const insensitive = createInMemoryLookupSource(GenericItems, options);
      const sensitive = createInMemoryLookupSource(GenericItems, {
        ...options,
        caseSensitive: true,
      });
      const page = { limit: 10, offset: 0 };
      expect(ids((await insensitive.search("AMET", page)).items)).toEqual([
        3, 11, 19,
      ]);
      expect((await sensitive.search("AMET", page)).items).toEqual([]);
      expect(ids((await sensitive.search("Amet", page)).items)).toEqual([
        3, 11, 19,
      ]);
    });
    test("A function is called on every call, so the list can be swapped", async () => {
      let items = GenericItems.slice(0, 2);
      const source = createInMemoryLookupSource(() => items, options);
      const page = { limit: 10, offset: 0 };
      expect(ids((await source.search("", page)).items)).toEqual([1, 2]);
      items = GenericItems.slice(2, 5);
      expect(ids((await source.search("", page)).items)).toEqual([3, 4, 5]);
    });
    test("Rejects an offset that is not a multiple of the limit", async () => {
      const source = createInMemoryLookupSource(GenericItems, options);
      await expect(source.search("", { limit: 10, offset: 5 })).rejects.toThrow(
        /multiple/,
      );
    });
  });

  describe("resolve", () => {
    test("The items of the values, in the order of the list, without the missing ones", async () => {
      const source = createInMemoryLookupSource(GenericItems, options);
      expect(ids(await source.resolve([11, 99, 3]))).toEqual([3, 11]);
    });
    test("An empty list resolves to []", async () => {
      const source = createInMemoryLookupSource(GenericItems, options);
      await expect(source.resolve([])).resolves.toEqual([]);
    });
    test("Rejects with AbortedException once the signal is aborted, though the in-memory reader ignores it", async () => {
      const source = createInMemoryLookupSource(GenericItems, options);
      const controller = new AbortController();
      const resolving = source.resolve([1], controller.signal);
      controller.abort();
      await expect(resolving).rejects.toBeInstanceOf(AbortedException);
    });
  });

  test("valueOf reads the value field", () => {
    const source = createInMemoryLookupSource(GenericItems, options);
    expect(source.valueOf(GenericItems[4])).toBe(5);
  });
});
