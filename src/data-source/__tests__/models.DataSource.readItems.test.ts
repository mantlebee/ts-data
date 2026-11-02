import { AbortedException } from "@mantlebee/ts-core";

import {
  createDataSource,
  DataSourcePayload,
  DataSourceReader,
  DataSourceReadNext,
  FilterExtension,
  IDataSourceExtension,
  PaginationExtension,
} from "@/data-source";
import { FilterLogics, FilterOperators } from "@/query-items";

type Item = { id: number; name: string };

const item1: Item = { id: 1, name: "one" };
const item2: Item = { id: 2, name: "two" };
const item3: Item = { id: 3, name: "three" };

type Stub = IDataSourceExtension<Item> & { dispose: jest.Mock; on: jest.Mock };

/** An extension made of the hooks given, nothing else. */
function createStub(hooks: Partial<IDataSourceExtension<Item>> = {}): Stub {
  return {
    dispose: jest.fn(async () => {}),
    on: jest.fn(() => ({ dispose: async () => {} })),
    ...hooks,
  } as Stub;
}

/** A reader recording the payloads it receives, resolving `items` every time. */
function createRecordingReader(items: Item[] = [item1, item2]) {
  const payloads: DataSourcePayload<Item>[] = [];
  const reader: DataSourceReader<Item> = async (payload) => {
    payloads.push(payload);
    return items;
  };
  return { payloads, reader };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const tick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("DataSource readItems: the onion around the reader", () => {
  describe("calls of next", () => {
    test("Zero calls: a cache hit returns its items and the reader is never invoked", async () => {
      const { payloads, reader } = createRecordingReader();
      const cached = [item3];
      const source = createDataSource(reader, {
        cache: createStub({ readItems: async () => cached }),
      });
      const itemsHandler = jest.fn();
      source.on("items", itemsHandler);
      await source.read();
      expect(payloads).toEqual([]);
      expect(source.items).toBe(cached);
      expect(itemsHandler).toHaveBeenCalledWith(cached);
    });
    test("One call with another payload: the reader receives the payload given to next, the result goes through", async () => {
      const { payloads, reader } = createRecordingReader();
      const source = createDataSource(reader, {
        sorting: createStub({
          buildPayload: async (payload) => ({
            ...payload,
            sorts: [{ field: "id", asc: true }],
          }),
        }),
        distinct: createStub({
          readItems: (payload, next) => next({ ...payload, distinct: true }),
        }),
      });
      await source.read();
      expect(payloads).toEqual([
        { distinct: true, sorts: [{ field: "id", asc: true }] },
      ]);
      expect(source.items).toEqual([item1, item2]);
    });
    test("N calls: the payload is split into several reads and the results merged", async () => {
      const payloads: DataSourcePayload<Item>[] = [];
      const reader: DataSourceReader<Item> = async (payload) => {
        payloads.push(payload);
        return payload.sorts?.[0]?.field === "id" ? [item1] : [item2];
      };
      const source = createDataSource(reader, {
        sorting: createStub({
          buildPayload: async (payload) => ({
            ...payload,
            sorts: [
              { field: "id", asc: true },
              { field: "name", asc: false },
            ],
          }),
        }),
        oneSortPerCall: createStub({
          readItems: async (payload, next) => {
            const reads = await Promise.all(
              (payload.sorts ?? []).map((sort) =>
                next({ ...payload, sorts: [sort] }),
              ),
            );
            return reads.flat();
          },
        }),
      });
      await source.read();
      expect(payloads).toEqual([
        {
          sorts: [{ field: "id", asc: true }],
        },
        {
          sorts: [{ field: "name", asc: false }],
        },
      ]);
      expect(source.items).toEqual([item1, item2]);
    });
    test("Every call of next runs the inner layers again: their hooks fire as many times", async () => {
      const { reader } = createRecordingReader();
      const inner = jest.fn(
        async (
          payload: DataSourcePayload<Item>,
          next: DataSourceReadNext<Item>,
        ) => next(payload),
      );
      const source = createDataSource(reader, {
        outer: createStub({
          readItems: async (payload, next) => {
            await next(payload);
            await next(payload);
            return next(payload);
          },
        }),
        inner: createStub({ readItems: inner }),
      });
      await source.read();
      expect(inner).toHaveBeenCalledTimes(3);
    });
    test("An extension without readItems is skipped: next of the outer layer reaches the next one that has it", async () => {
      const calls: string[] = [];
      const { reader } = createRecordingReader();
      const layer = (name: string) =>
        createStub({
          readItems: async (payload, next) => {
            calls.push(`${name} in`);
            const items = await next(payload);
            calls.push(`${name} out`);
            return items;
          },
        });
      const source = createDataSource(reader, {
        a: layer("a"),
        plain: createStub({ buildPayload: async (payload) => payload }),
        b: layer("b"),
      });
      await source.read();
      expect(calls).toEqual(["a in", "b in", "b out", "a out"]);
    });
  });

  describe("the whole payload", () => {
    test("readItems sees the payload completed by every buildPayload, also when its key comes first", async () => {
      const { payloads, reader } = createRecordingReader();
      const seen: DataSourcePayload<Item>[] = [];
      const filtering = new FilterExtension<Item>();
      const pagination = new PaginationExtension<Item>(async () => 2, 10);
      const source = createDataSource(reader, {
        probe: createStub({
          readItems: (payload, next) => {
            seen.push(payload);
            return next(payload);
          },
        }),
        filtering,
        pagination,
      });
      filtering.addFilter({
        field: "id",
        operator: FilterOperators.equal,
        value: 1,
      });
      await source.read();
      expect(seen).toHaveLength(1);
      expect(seen[0]).toEqual({
        filters: {
          filters: [{ field: "id", operator: FilterOperators.equal, value: 1 }],
          logic: FilterLogics.and,
        },
        pagination: { itemsPerPage: 10, page: 1, totalItemsCount: 2 },
      });
      expect(seen[0]).toBe(payloads[0]);
    });
  });

  describe("order of the transformations", () => {
    test("The result flows outward: the first key transforms last", async () => {
      const { reader } = createRecordingReader([item1]);
      const append = (item: Item) =>
        createStub({
          readItems: async (payload, next) => [...(await next(payload)), item],
        });
      const source = createDataSource(reader, {
        a: append(item2),
        b: append(item3),
      });
      await source.read();
      expect(source.items).toEqual([item1, item3, item2]);
    });
  });

  describe("abort inside the chain", () => {
    test("next called after the read was superseded rejects with AbortedException", async () => {
      const deferreds: ReturnType<typeof createDeferred<Item[]>>[] = [];
      const reader: DataSourceReader<Item> = () => {
        const deferred = createDeferred<Item[]>();
        deferreds.push(deferred);
        return deferred.promise;
      };
      const caught: unknown[] = [];
      let resumeFirst!: () => void;
      const gate = new Promise<void>((resolve) => {
        resumeFirst = resolve;
      });
      let reads = 0;
      const source = createDataSource(reader, {
        twice: createStub({
          readItems: async (payload, next) => {
            const first = await next(payload);
            if (reads++ === 0) await gate; // the first read waits to be superseded
            try {
              return [...first, ...(await next(payload))];
            } catch (error) {
              caught.push(error);
              throw error;
            }
          },
        }),
      });
      const errorHandler = jest.fn();
      source.on("error", errorHandler);

      const first = source.read();
      first.catch(() => undefined);
      await tick();
      deferreds[0].resolve([item1]); // the first next of the first read
      await tick();
      const second = source.read();
      await tick();
      await expect(first).rejects.toBeInstanceOf(AbortedException);
      resumeFirst(); // the first read calls next again, superseded
      await tick();
      expect(caught).toHaveLength(1);
      expect(caught[0]).toBeInstanceOf(AbortedException);
      expect(deferreds).toHaveLength(2); // the reader was not invoked by that call
      deferreds[1].resolve([item2]); // the first next of the second read
      await tick();
      expect(deferreds).toHaveLength(3); // its second next reached the reader
      deferreds[2].resolve([item3]);
      await second;
      expect(source.items).toEqual([item2, item3]);
      expect(errorHandler).not.toHaveBeenCalled();
    });
    test("A result returned in silence after the abort is not handed to the outer layers nor to the source", async () => {
      const deferred = createDeferred<Item[]>();
      const reader: DataSourceReader<Item> = () => deferred.promise;
      const afterNext = jest.fn();
      const source = createDataSource(reader, {
        outer: createStub({
          readItems: async (payload, next) => {
            const items = await next(payload);
            afterNext(items);
            return items;
          },
        }),
        swallowing: createStub({
          readItems: async (payload, next) => {
            try {
              return await next(payload);
            } catch {
              return []; // swallows the AbortedException of next
            }
          },
        }),
      });
      const itemsHandler = jest.fn();
      const errorHandler = jest.fn();
      source.on("items", itemsHandler);
      source.on("error", errorHandler);

      const reading = source.read();
      reading.catch(() => undefined);
      await tick();
      await source.dispose();
      deferred.resolve([item1]);
      await tick();
      await expect(reading).rejects.toBeInstanceOf(AbortedException);
      expect(afterNext).not.toHaveBeenCalled();
      expect(itemsHandler).not.toHaveBeenCalled();
      expect(errorHandler).not.toHaveBeenCalled();
      expect(source.items).toEqual([]);
    });
    test("An error of readItems in the latest read is a read error: error event and rejection", async () => {
      const { reader } = createRecordingReader();
      const error = new Error("read failed");
      const source = createDataSource(reader, {
        failing: createStub({
          readItems: async () => {
            throw error;
          },
        }),
      });
      const errorHandler = jest.fn();
      source.on("error", errorHandler);
      await expect(source.read()).rejects.toBe(error);
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });
});
