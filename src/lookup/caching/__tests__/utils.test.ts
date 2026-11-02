import { AbortedException } from "@mantlebee/ts-core";

import {
  createStubLookupSource,
  Department,
  Departments,
  tick,
} from "@test/fixtures/lookup";

import { withCache } from "../utils";

const [sales, marketing, research] = Departments;

describe("withCache", () => {
  describe("resolve", () => {
    test("A hit never calls the inner source", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      await expect(cached.resolve([1])).resolves.toEqual([sales]);
      await expect(cached.resolve([1])).resolves.toEqual([sales]);
      expect(resolve).toHaveBeenCalledTimes(1);
    });
    test("Only the misses are asked, duplicates once", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      await cached.resolve([1, 2]);
      const items = await cached.resolve([2, 3, 3, 1]);
      expect(items).toHaveLength(3);
      expect(items).toEqual(
        expect.arrayContaining([sales, marketing, research]),
      );
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(resolve.mock.calls[1][0]).toEqual([3]);
    });
    test("A pending resolution of a value is shared by the callers asking for it meanwhile", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      const results = await Promise.all([
        cached.resolve([1]),
        cached.resolve([1, 2]),
      ]);
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(resolve.mock.calls.map((call) => call[0])).toEqual([[1], [2]]);
      expect(results).toEqual([[sales], [sales, marketing]]);
    });
    test("A missing value is cached: it is not asked again", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      await expect(cached.resolve([99])).resolves.toEqual([]);
      await expect(cached.resolve([99, 1])).resolves.toEqual([sales]);
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(resolve.mock.calls[1][0]).toEqual([1]);
    });
    test("A rejected resolution is not cached: the next call tries again", async () => {
      const { resolve, source } = createStubLookupSource();
      const failure = new Error("boom");
      resolve.mockRejectedValueOnce(failure);
      const cached = withCache(source);
      await expect(cached.resolve([1])).rejects.toBe(failure);
      await expect(cached.resolve([1])).resolves.toEqual([sales]);
      expect(resolve).toHaveBeenCalledTimes(2);
    });
    test("An empty list resolves to [] without calling the inner source", async () => {
      const { resolve, source } = createStubLookupSource();
      await expect(withCache(source).resolve([])).resolves.toEqual([]);
      expect(resolve).not.toHaveBeenCalled();
    });
    test("The signal is not forwarded: the aborted caller rejects with AbortedException, the cache is filled anyway", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      const controller = new AbortController();
      const aborted = cached.resolve([1], controller.signal);
      controller.abort();
      await expect(aborted).rejects.toBeInstanceOf(AbortedException);
      expect(resolve.mock.calls[0]).toEqual([[1]]);
      await tick();
      await expect(cached.resolve([1])).resolves.toEqual([sales]);
      expect(resolve).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidate", () => {
    test("Drops the entries of the values given: they are asked again, the others are not", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      await cached.resolve([1, 2]);
      cached.invalidate([1]);
      await cached.resolve([1, 2]);
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(resolve.mock.calls[1][0]).toEqual([1]);
    });
    test("Without argument drops every entry", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      await cached.resolve([1, 2]);
      cached.invalidate();
      await cached.resolve([1, 2]);
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(resolve.mock.calls[1][0]).toEqual([1, 2]);
    });
    test("Drops a pending entry too: the call in flight keeps its result, the next call asks again", async () => {
      const { resolve, source } = createStubLookupSource();
      const cached = withCache(source);
      const inFlight = cached.resolve([1]);
      cached.invalidate([1]);
      await expect(inFlight).resolves.toEqual([sales]);
      await cached.resolve([1]);
      expect(resolve).toHaveBeenCalledTimes(2);
    });
    test("A rejection settling after the value was asked again does not drop the new entry", async () => {
      const { resolve, source } = createStubLookupSource();
      let fail!: (reason: unknown) => void;
      resolve.mockImplementationOnce(
        () => new Promise<Department[]>((_, reject) => (fail = reject)),
      );
      const cached = withCache(source);
      const first = cached.resolve([1]);
      cached.invalidate([1]);
      const second = cached.resolve([1]);
      fail(new Error("boom"));
      await expect(first).rejects.toThrow("boom");
      await expect(second).resolves.toEqual([sales]);
      await expect(cached.resolve([1])).resolves.toEqual([sales]);
      expect(resolve).toHaveBeenCalledTimes(2);
    });
  });

  test("search and valueOf pass through, signal included", async () => {
    const { search, source } = createStubLookupSource();
    const cached = withCache(source);
    const page = { limit: 10, offset: 0 };
    const { signal } = new AbortController();
    await expect(cached.search("sal", page, signal)).resolves.toEqual({
      hasMore: false,
      items: Departments,
    });
    expect(search).toHaveBeenCalledWith("sal", page, signal);
    expect(cached.valueOf(research)).toBe(3);
  });
});
