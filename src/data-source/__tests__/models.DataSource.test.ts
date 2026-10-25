import {
  DataSource,
  DataSourcePayload,
  FilterExtension,
  IDataSourceExtension,
  PaginationExtension,
} from "@/data-source";
import { Filter, FilterOperators } from "@/query-items";

type Item = { id: number; name: string };
type Reader = (payload: DataSourcePayload<Item>) => Promise<Item[]>;

const item1: Item = { id: 1, name: "one" };
const item2: Item = { id: 2, name: "two" };
const item3: Item = { id: 3, name: "three" };

const filter: Filter<Item> = {
  field: "id",
  operator: FilterOperators.equal,
  value: 1,
};

type Stub = IDataSourceExtension<Item> & {
  dispose: jest.Mock;
  on: jest.Mock;
};

function createStub(hooks: Partial<IDataSourceExtension<Item>> = {}): Stub {
  return {
    dispose: jest.fn(async () => {}),
    on: jest.fn(() => ({ dispose: async () => {} })),
    ...hooks,
  } as Stub;
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("DataSource", () => {
  describe("isReading", () => {
    test("Is false before read, true while the reader is pending, false after it resolves", async () => {
      const deferred = createDeferred<Item[]>();
      const dataSource = new DataSource<Item>(() => deferred.promise);
      expect(dataSource.isReading).toBe(false);
      const reading = dataSource.read();
      expect(dataSource.isReading).toBe(true);
      deferred.resolve([item1]);
      await reading;
      expect(dataSource.isReading).toBe(false);
    });
    test("The isReading event is raised with true then false", async () => {
      const dataSource = new DataSource<Item>(async () => [item1]);
      const handler = jest.fn();
      dataSource.on("isReading", handler);
      await dataSource.read();
      expect(handler.mock.calls).toEqual([[true], [false]]);
    });
  });

  describe("read", () => {
    test("Items are empty before the first read", () => {
      const dataSource = new DataSource<Item>(async () => [item1]);
      expect(dataSource.items).toEqual([]);
    });
    test("Items are what the reader returned and the items event is raised once", async () => {
      const dataSource = new DataSource<Item>(async () => [item1, item2]);
      const handler = jest.fn();
      dataSource.on("items", handler);
      await dataSource.read();
      expect(dataSource.items).toEqual([item1, item2]);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith([item1, item2]);
    });
    test("Without extensions the reader is called with an empty payload", async () => {
      const reader = jest.fn<Promise<Item[]>, Parameters<Reader>>(
        async () => [item1],
      );
      const dataSource = new DataSource<Item>(reader);
      await dataSource.read();
      expect(reader).toHaveBeenCalledWith({});
    });

    describe("when the reader rejects", () => {
      test("The error event is raised and read rejects with the same error", async () => {
        const error = new Error("reader failed");
        const dataSource = new DataSource<Item>(async () => {
          throw error;
        });
        const errorHandler = jest.fn();
        const itemsHandler = jest.fn();
        dataSource.on("error", errorHandler);
        dataSource.on("items", itemsHandler);
        await expect(dataSource.read()).rejects.toBe(error);
        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(errorHandler).toHaveBeenCalledWith(error);
        expect(itemsHandler).not.toHaveBeenCalled();
      });
      test("isReading is false afterwards and the isReading event got false", async () => {
        const dataSource = new DataSource<Item>(async () => {
          throw new Error("reader failed");
        });
        const handler = jest.fn();
        dataSource.on("isReading", handler);
        await expect(dataSource.read()).rejects.toThrow("reader failed");
        expect(dataSource.isReading).toBe(false);
        expect(handler.mock.calls).toEqual([[true], [false]]);
      });
      test("Items keep the previous value", async () => {
        const reader = jest
          .fn<Promise<Item[]>, Parameters<Reader>>()
          .mockResolvedValueOnce([item1, item2])
          .mockRejectedValueOnce(new Error("second read failed"));
        const dataSource = new DataSource<Item>(reader);
        await dataSource.read();
        await expect(dataSource.read()).rejects.toThrow("second read failed");
        expect(dataSource.items).toEqual([item1, item2]);
      });
    });

    describe("when getItemsBefore of an extension rejects", () => {
      test("The error event is raised, read rejects and the reader is not called", async () => {
        const error = new Error("before failed");
        const reader = jest.fn<Promise<Item[]>, Parameters<Reader>>(
          async () => [item1],
        );
        const extension = createStub({
          getItemsBefore: async () => {
            throw error;
          },
        });
        const dataSource = new DataSource<Item>(reader, [extension]);
        const errorHandler = jest.fn();
        const isReadingHandler = jest.fn();
        dataSource.on("error", errorHandler);
        dataSource.on("isReading", isReadingHandler);
        await expect(dataSource.read()).rejects.toBe(error);
        expect(errorHandler).toHaveBeenCalledTimes(1);
        expect(errorHandler).toHaveBeenCalledWith(error);
        expect(reader).not.toHaveBeenCalled();
        expect(dataSource.isReading).toBe(false);
        expect(isReadingHandler.mock.calls).toEqual([[true], [false]]);
        expect(dataSource.items).toEqual([]);
      });
    });
  });

  describe("hooks order", () => {
    test("getItemsBefore and getItemsAfter run in array order and the payload flows through the extensions", async () => {
      const calls: string[] = [];
      let payloadReceivedByB: DataSourcePayload<Item> | undefined;
      const payloadOfA: DataSourcePayload<Item> = {
        sorts: [{ field: "id", asc: true }],
      };
      const payloadOfB: DataSourcePayload<Item> = {
        sorts: [{ field: "name", asc: false }],
      };
      const extensionA = createStub({
        getItemsAfter: async (items) => {
          calls.push("after A");
          return items;
        },
        getItemsBefore: async () => {
          calls.push("before A");
          return payloadOfA;
        },
      });
      const extensionB = createStub({
        getItemsAfter: async (items) => {
          calls.push("after B");
          return items;
        },
        getItemsBefore: async (payload) => {
          calls.push("before B");
          payloadReceivedByB = payload;
          return payloadOfB;
        },
      });
      const reader = jest.fn<Promise<Item[]>, Parameters<Reader>>(async () => {
        calls.push("reader");
        return [item1];
      });
      const dataSource = new DataSource<Item>(reader, [
        extensionA,
        extensionB,
      ]);
      await dataSource.read();
      expect(calls).toEqual([
        "before A",
        "before B",
        "reader",
        "after A",
        "after B",
      ]);
      expect(payloadReceivedByB).toBe(payloadOfA);
      expect(reader).toHaveBeenCalledTimes(1);
      expect(reader).toHaveBeenCalledWith(payloadOfB);
    });
    test("getItemsAfter receives the items of the previous extension and the payload used to read", async () => {
      const payload: DataSourcePayload<Item> = {
        sorts: [{ field: "id", asc: true }],
      };
      const afterB = jest.fn(async (items: Item[]) => items);
      const extensionA = createStub({
        getItemsAfter: async () => [item3],
        getItemsBefore: async () => payload,
      });
      const extensionB = createStub({ getItemsAfter: afterB });
      const dataSource = new DataSource<Item>(async () => [item1], [
        extensionA,
        extensionB,
      ]);
      await dataSource.read();
      expect(afterB).toHaveBeenCalledWith([item3], payload);
      expect(dataSource.items).toEqual([item3]);
    });
    test("Extensions without hooks are skipped", async () => {
      const dataSource = new DataSource<Item>(async () => [item1], [
        createStub(),
      ]);
      await dataSource.read();
      expect(dataSource.items).toEqual([item1]);
    });
  });

  describe("getItemsAfter", () => {
    test("Can transform the items and the items event carries the transformed list", async () => {
      const reverse = createStub({
        getItemsAfter: async (items) => [...items].reverse(),
      });
      const dataSource = new DataSource<Item>(
        async () => [item1, item2, item3],
        [reverse],
      );
      const handler = jest.fn();
      dataSource.on("items", handler);
      await dataSource.read();
      expect(dataSource.items).toEqual([item3, item2, item1]);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith([item3, item2, item1]);
    });
    test("An error thrown by getItemsAfter raises the error event and rejects", async () => {
      const error = new Error("after failed");
      const extension = createStub({
        getItemsAfter: async () => {
          throw error;
        },
      });
      const dataSource = new DataSource<Item>(async () => [item1], [
        extension,
      ]);
      const handler = jest.fn();
      dataSource.on("error", handler);
      await expect(dataSource.read()).rejects.toBe(error);
      expect(handler).toHaveBeenCalledWith(error);
      expect(dataSource.items).toEqual([]);
    });
  });

  describe("getExtension", () => {
    test("Returns the instance when present, typed", () => {
      const filtering = new FilterExtension<Item>();
      const dataSource = new DataSource<Item>(async () => [], [
        createStub(),
        filtering,
      ]);
      // The type argument is needed: FilterExtension is generic, so the
      // constructor alone is inferred as the constraint (IDataSourceExtension).
      const found = dataSource.getExtension<FilterExtension<Item>>(FilterExtension);
      expect(found).toBe(filtering);
      // No cast needed to reach the members of the extension.
      found?.addFilter(filter);
      expect(found?.filters).toEqual([filter]);
    });
    test("Returns null when absent", () => {
      const dataSource = new DataSource<Item>(async () => [], [
        createStub(),
      ]);
      expect(dataSource.getExtension(FilterExtension)).toBeNull();
      expect(dataSource.getExtension(PaginationExtension)).toBeNull();
    });
    test("Returns null when there are no extensions", () => {
      const dataSource = new DataSource<Item>(async () => []);
      expect(dataSource.getExtension(FilterExtension)).toBeNull();
    });
    test("Returns the first extension when more than one is an instance", () => {
      const first = new FilterExtension<Item>();
      const second = new FilterExtension<Item>();
      const dataSource = new DataSource<Item>(async () => [], [
        first,
        second,
      ]);
      expect(dataSource.getExtension(FilterExtension)).toBe(first);
    });
  });

  describe("dispose", () => {
    test("Returns a Promise", async () => {
      const dataSource = new DataSource<Item>(async () => []);
      const result = dataSource.dispose();
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
    test("Disposes every extension", async () => {
      const extensionA = createStub();
      const extensionB = createStub();
      const dataSource = new DataSource<Item>(async () => [], [
        extensionA,
        extensionB,
      ]);
      await dataSource.dispose();
      expect(extensionA.dispose).toHaveBeenCalledTimes(1);
      expect(extensionB.dispose).toHaveBeenCalledTimes(1);
    });
    test("Handlers registered with on are no longer invoked by a read", async () => {
      const dataSource = new DataSource<Item>(async () => [item1]);
      const itemsHandler = jest.fn();
      const isReadingHandler = jest.fn();
      dataSource.on("items", itemsHandler);
      dataSource.on("isReading", isReadingHandler);
      await dataSource.dispose();
      await dataSource.read();
      expect(itemsHandler).not.toHaveBeenCalled();
      expect(isReadingHandler).not.toHaveBeenCalled();
    });
  });

  describe("DataSourceExtension", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test("filtersChange is raised only after the delay", () => {
      const extension = new FilterExtension<Item>();
      const handler = jest.fn();
      extension.on("filtersChange", handler);
      extension.addFilter(filter);
      jest.advanceTimersByTime(99);
      expect(handler).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith([filter], true);
    });
    test("Two quick mutations raise filtersChange once", () => {
      const extension = new FilterExtension<Item>();
      const handler = jest.fn();
      extension.on("filtersChange", handler);
      extension.addFilter(filter);
      jest.advanceTimersByTime(50);
      extension.clearFilters();
      jest.advanceTimersByTime(99);
      expect(handler).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith([], false);
    });
    test("The changeDelay option shortens the wait", () => {
      const extension = new FilterExtension<Item>({ changeDelay: 10 });
      const handler = jest.fn();
      extension.on("filtersChange", handler);
      extension.addFilter(filter);
      jest.advanceTimersByTime(9);
      expect(handler).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      expect(handler).toHaveBeenCalledTimes(1);
    });
    test("dispose before the delay cancels the pending event", async () => {
      const extension = new FilterExtension<Item>();
      const handler = jest.fn();
      extension.on("filtersChange", handler);
      extension.addFilter(filter);
      jest.advanceTimersByTime(50);
      await extension.dispose();
      jest.advanceTimersByTime(1000);
      expect(handler).not.toHaveBeenCalled();
    });
    test("The mutation events are not debounced", () => {
      const extension = new FilterExtension<Item>();
      const handler = jest.fn();
      extension.on("addFilter", handler);
      extension.addFilter(filter);
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
