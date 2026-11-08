import { AbortedException, List } from "@mantlebee/ts-core";

import {
  FilterLogics,
  FilterOperators,
  QueryItemsPayload,
  QueryItemsReader,
} from "@/query-items";
import { Department, Departments } from "@test/fixtures/lookup";

import { ILookupSource } from "../interfaces";
import { createLookupSource } from "../utils";

/** A reader spied on, serving `items` whatever the payload. */
function createReader(items: List<Department> = Departments) {
  return jest.fn<
    Promise<List<Department>>,
    [QueryItemsPayload<Department>, AbortSignal?]
  >(async () => items);
}
const options = { textField: "name", valueField: "id" } as const;
const page = { limit: 2, offset: 0 };

describe("createLookupSource", () => {
  describe("search", () => {
    test("The payload asks `textField contains query` with the 1-based page of the offset", async () => {
      const reader = createReader();
      const source = createLookupSource(reader, options);
      await source.search("sal", { limit: 20, offset: 40 });
      expect(reader).toHaveBeenCalledTimes(1);
      expect(reader.mock.calls[0][0]).toEqual({
        filters: {
          filters: [
            { field: "name", operator: FilterOperators.contains, value: "sal" },
          ],
          logic: FilterLogics.and,
        },
        pagination: { itemsPerPage: 20, page: 3, totalItemsCount: 0 },
      });
    });
    test("An empty query sends no filters", async () => {
      const reader = createReader();
      await createLookupSource(reader, options).search("", page);
      expect(reader.mock.calls[0][0]).toEqual({
        filters: undefined,
        pagination: { itemsPerPage: 2, page: 1, totalItemsCount: 0 },
      });
    });
    test("The signal is handed to the reader", async () => {
      const reader = createReader();
      const { signal } = new AbortController();
      await createLookupSource(reader, options).search("", page, signal);
      expect(reader.mock.calls[0][1]).toBe(signal);
    });
    test("`hasMore` is true for a full page, false for a shorter one", async () => {
      const full = createLookupSource(createReader(Departments), options);
      await expect(full.search("", { limit: 4, offset: 0 })).resolves.toEqual({
        hasMore: true,
        items: Departments,
      });
      const short = createLookupSource(createReader(Departments), options);
      await expect(short.search("", { limit: 5, offset: 0 })).resolves.toEqual({
        hasMore: false,
        items: Departments,
      });
    });
    test.each([
      ["a limit of 0", { limit: 0, offset: 0 }],
      ["a fractional limit", { limit: 2.5, offset: 0 }],
      [
        "an offset that is not a multiple of the limit",
        { limit: 2, offset: 3 },
      ],
      ["a negative offset", { limit: 2, offset: -2 }],
      ["a fractional offset", { limit: 2, offset: 0.5 }],
    ])("Rejects %s without calling the reader", async (_, invalid) => {
      const reader = createReader();
      const searching = createLookupSource(reader, options).search("", invalid);
      await expect(searching).rejects.toBeInstanceOf(RangeError);
      await expect(searching).rejects.toThrow(/lookup page/);
      expect(reader).not.toHaveBeenCalled();
    });
    test("Names the limit in the message of a misaligned offset", async () => {
      await expect(
        createLookupSource(createReader(), options).search("", {
          limit: 20,
          offset: 30,
        }),
      ).rejects.toThrow(
        new RangeError(
          "The offset of a lookup page must be a non-negative multiple of its limit (20), got 30",
        ),
      );
    });
    test("Accepts every multiple of the limit", async () => {
      const reader = createReader();
      const source = createLookupSource(reader, options);
      for (const offset of [0, 2, 4])
        await source.search("", { limit: 2, offset });
      expect(
        reader.mock.calls.map(([payload]) => payload.pagination?.page),
      ).toEqual([1, 2, 3]);
    });
    test("Rejects with AbortedException once the signal is aborted, even when the reader ignores the signal", async () => {
      const reader: QueryItemsReader<Department> = () =>
        new Promise(() => undefined); // never settles, never looks at the signal
      const controller = new AbortController();
      const searching = createLookupSource(reader, options).search(
        "",
        page,
        controller.signal,
      );
      controller.abort();
      await expect(searching).rejects.toBeInstanceOf(AbortedException);
    });
  });

  describe("resolve", () => {
    test("The payload asks `valueField in values`, without pagination", async () => {
      const reader = createReader();
      await createLookupSource(reader, options).resolve([3, 1]);
      expect(reader.mock.calls[0][0]).toEqual({
        filters: {
          filters: [
            { field: "id", operator: FilterOperators.in, value: [3, 1] },
          ],
          logic: FilterLogics.and,
        },
      });
    });
    test("The items are the ones of the reader, as they are", async () => {
      const reader = createReader([Departments[2], Departments[0]]);
      await expect(
        createLookupSource(reader, options).resolve([3, 1]),
      ).resolves.toEqual([Departments[2], Departments[0]]);
    });
    test("An empty list resolves to [] without calling the reader", async () => {
      const reader = createReader();
      await expect(
        createLookupSource(reader, options).resolve([]),
      ).resolves.toEqual([]);
      expect(reader).not.toHaveBeenCalled();
    });
    test("The signal is handed to the reader", async () => {
      const reader = createReader();
      const { signal } = new AbortController();
      await createLookupSource(reader, options).resolve([1], signal);
      expect(reader.mock.calls[0][1]).toBe(signal);
    });
    test("Rejects with AbortedException without calling the reader when the signal is already aborted", async () => {
      const reader = createReader();
      const controller = new AbortController();
      controller.abort();
      await expect(
        createLookupSource(reader, options).resolve([1], controller.signal),
      ).rejects.toBeInstanceOf(AbortedException);
      expect(reader).not.toHaveBeenCalled();
    });
  });

  describe("valueOf", () => {
    test("Reads the value field, and types the source with it", () => {
      const source: ILookupSource<Department, number> = createLookupSource(
        createReader(),
        options,
      );
      expect(source.valueOf(Departments[1])).toBe(2);
      const byName = createLookupSource(createReader(), {
        textField: "name",
        valueField: "name",
      });
      const name: string = byName.valueOf(Departments[1]);
      expect(name).toBe("Marketing");
    });
  });
});
