import { AbortedException } from "@mantlebee/ts-core";

import {
  createStubLookupSource,
  Departments,
  tick,
} from "@test/fixtures/lookup";

import { withBatching } from "../utils";

const [sales, marketing, research] = Departments;

describe("withBatching", () => {
  describe("resolve", () => {
    test("Three calls in the same tick are one call of the inner source with the three values, each caller getting its own items", async () => {
      const { resolve, source } = createStubLookupSource();
      const batched = withBatching(source);
      const results = await Promise.all([
        batched.resolve([1]),
        batched.resolve([2]),
        batched.resolve([3]),
      ]);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(resolve.mock.calls[0][0]).toEqual([1, 2, 3]);
      expect(results).toEqual([[sales], [marketing], [research]]);
    });
    test("The same value asked twice is sent once, and both callers get it", async () => {
      const { resolve, source } = createStubLookupSource();
      const batched = withBatching(source);
      const results = await Promise.all([
        batched.resolve([1, 2]),
        batched.resolve([2]),
      ]);
      expect(resolve).toHaveBeenCalledTimes(1);
      expect(resolve.mock.calls[0][0]).toEqual([1, 2]);
      expect(results).toEqual([[sales, marketing], [marketing]]);
    });
    test("Two values asked in different ticks are two calls", async () => {
      const { resolve, source } = createStubLookupSource();
      const batched = withBatching(source);
      await batched.resolve([1]);
      await batched.resolve([2]);
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(resolve.mock.calls.map((call) => call[0])).toEqual([[1], [2]]);
    });
    test("A value the inner source does not return is missing for its caller", async () => {
      const { source } = createStubLookupSource();
      const batched = withBatching(source);
      const results = await Promise.all([
        batched.resolve([1, 99]),
        batched.resolve([99]),
      ]);
      expect(results).toEqual([[sales], []]);
    });
    test("With `chunkSize: 2`, three values are two calls, run together", async () => {
      const { resolve, source } = createStubLookupSource();
      const batched = withBatching(source, { chunkSize: 2 });
      const results = await Promise.all([
        batched.resolve([1, 2]),
        batched.resolve([3]),
      ]);
      expect(resolve).toHaveBeenCalledTimes(2);
      expect(resolve.mock.calls.map((call) => call[0])).toEqual([[1, 2], [3]]);
      expect(results).toEqual([[sales, marketing], [research]]);
    });
    test("A rejected call of the inner source rejects every caller of the batch", async () => {
      const { resolve, source } = createStubLookupSource();
      const failure = new Error("boom");
      resolve.mockRejectedValueOnce(failure);
      const batched = withBatching(source);
      const first = batched.resolve([1]);
      const second = batched.resolve([2]);
      await expect(first).rejects.toBe(failure);
      await expect(second).rejects.toBe(failure);
      // The next tick opens a new batch: the failure is not sticky.
      await expect(batched.resolve([1])).resolves.toEqual([sales]);
    });
    test("An empty list resolves to [] without opening a batch", async () => {
      const { resolve, source } = createStubLookupSource();
      await expect(withBatching(source).resolve([])).resolves.toEqual([]);
      await tick();
      expect(resolve).not.toHaveBeenCalled();
    });
    test("The signal is not forwarded: the aborted caller rejects with AbortedException, the others get their items", async () => {
      const { resolve, source } = createStubLookupSource();
      const batched = withBatching(source);
      const controller = new AbortController();
      const aborted = batched.resolve([1], controller.signal);
      const kept = batched.resolve([2]);
      controller.abort();
      await expect(aborted).rejects.toBeInstanceOf(AbortedException);
      await expect(kept).resolves.toEqual([marketing]);
      expect(resolve.mock.calls[0]).toEqual([[1, 2]]);
    });
  });

  test("search and valueOf pass through, signal included", async () => {
    const { search, source } = createStubLookupSource();
    const batched = withBatching(source);
    const page = { limit: 10, offset: 0 };
    const { signal } = new AbortController();
    await expect(batched.search("sal", page, signal)).resolves.toEqual({
      hasMore: false,
      items: Departments,
    });
    expect(search).toHaveBeenCalledWith("sal", page, signal);
    expect(batched.valueOf(research)).toBe(3);
  });

  test.each([0, -1, 1.5])("Refuses a chunk size of %p", (chunkSize) => {
    const { source } = createStubLookupSource();
    expect(() => withBatching(source, { chunkSize })).toThrow(/chunk size/);
  });
});
