import { AbortedException, isAbortedException } from "@mantlebee/ts-core";

import {
  DataSource,
  DataSourcePayload,
  IDataSourceExtension,
  PaginationExtension,
} from "@/data-source";

type Item = { id: number; name: string };
type Reader = (
  payload: DataSourcePayload<Item>,
  signal?: AbortSignal,
) => Promise<Item[]>;

const item1: Item = { id: 1, name: "one" };
const item2: Item = { id: 2, name: "two" };

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
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, reject, resolve };
}

/**
 * Reader resolved by hand: every call gets its own deferred, in order, so a
 * spec decides which read settles first.
 */
function createDeferredReader() {
  const deferreds: ReturnType<typeof createDeferred<Item[]>>[] = [];
  const reader = jest.fn<Promise<Item[]>, Parameters<Reader>>(() => {
    const deferred = createDeferred<Item[]>();
    deferreds.push(deferred);
    return deferred.promise;
  });
  return { deferreds, reader };
}

/**
 * Lets the read cycle reach its next `await` (the hooks and the reader are
 * invoked on later microtasks) and lets the settled promises run their
 * handlers.
 */
const tick = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Starts a read whose rejection is observed at once, so a superseded read
 * never surfaces as an unhandled rejection before the spec asserts on it.
 */
function startRead(dataSource: DataSource<Item>): Promise<void> {
  const reading = dataSource.read();
  reading.catch(() => undefined);
  return reading;
}

describe("DataSource concurrency: the latest read wins", () => {
  describe("two reads", () => {
    test("The first resolves last: items and the single items event are of the second, the first rejects with AbortedException", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const itemsHandler = jest.fn();
      dataSource.on("items", itemsHandler);

      const first = startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      expect(reader).toHaveBeenCalledTimes(2);
      // Rejected at once, before any reader settles.
      await expect(first).rejects.toBeInstanceOf(AbortedException);
      await first.catch((error) => expect(isAbortedException(error)).toBe(true));

      deferreds[1].resolve([item2]);
      await expect(second).resolves.toBeUndefined();
      deferreds[0].resolve([item1]);
      await tick();

      expect(dataSource.items).toEqual([item2]);
      expect(itemsHandler.mock.calls).toEqual([[[item2]]]);
    });
    test("The first resolves first: its items are discarded, the first still rejects, the items event is raised once with the second result", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const itemsHandler = jest.fn();
      dataSource.on("items", itemsHandler);

      const first = startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();

      deferreds[0].resolve([item1]);
      await tick();
      expect(dataSource.items).toEqual([]);
      expect(itemsHandler).not.toHaveBeenCalled();
      await expect(first).rejects.toBeInstanceOf(AbortedException);

      deferreds[1].resolve([item2]);
      await second;
      expect(dataSource.items).toEqual([item2]);
      expect(itemsHandler.mock.calls).toEqual([[[item2]]]);
    });
    test("A third read supersedes the second the same way and only the third sets the items", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const itemsHandler = jest.fn();
      dataSource.on("items", itemsHandler);

      const first = startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      const third = startRead(dataSource);
      await tick();
      await expect(first).rejects.toBeInstanceOf(AbortedException);
      await expect(second).rejects.toBeInstanceOf(AbortedException);

      deferreds[2].resolve([item2]);
      deferreds[1].resolve([item1]);
      deferreds[0].resolve([item1]);
      await third;
      await tick();
      expect(dataSource.items).toEqual([item2]);
      expect(itemsHandler.mock.calls).toEqual([[[item2]]]);
    });
  });

  describe("isReading", () => {
    test("Is true from the first read until the second settles; the event is raised exactly true then false", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const isReadingHandler = jest.fn();
      dataSource.on("isReading", isReadingHandler);

      const first = startRead(dataSource);
      expect(dataSource.isReading).toBe(true);
      await tick();
      const second = startRead(dataSource);
      await tick();
      await expect(first).rejects.toBeInstanceOf(AbortedException);
      expect(dataSource.isReading).toBe(true);

      deferreds[0].resolve([item1]);
      await tick();
      expect(dataSource.isReading).toBe(true);
      expect(isReadingHandler.mock.calls).toEqual([[true]]);

      deferreds[1].resolve([item2]);
      await second;
      expect(dataSource.isReading).toBe(false);
      expect(isReadingHandler.mock.calls).toEqual([[true], [false]]);
    });
    test("Is false again when the latest read fails, after a superseded one", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const isReadingHandler = jest.fn();
      dataSource.on("isReading", isReadingHandler);

      startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      deferreds[1].reject(new Error("second failed"));
      await expect(second).rejects.toThrow("second failed");
      deferreds[0].resolve([item1]);
      await tick();

      expect(dataSource.isReading).toBe(false);
      expect(isReadingHandler.mock.calls).toEqual([[true], [false]]);
    });
  });

  describe("error", () => {
    test("A superseded read raises no error event, even when its reader rejects afterwards", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const errorHandler = jest.fn();
      dataSource.on("error", errorHandler);

      const first = startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      await expect(first).rejects.toBeInstanceOf(AbortedException);
      // What fetch does when its signal is aborted.
      deferreds[0].reject(new DOMException("The operation was aborted.", "AbortError"));
      await tick();
      expect(errorHandler).not.toHaveBeenCalled();

      deferreds[1].resolve([item2]);
      await second;
      expect(errorHandler).not.toHaveBeenCalled();
      expect(dataSource.items).toEqual([item2]);
    });
    test("A failing latest read raises the error event and rejects with the error, as before", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const errorHandler = jest.fn();
      const itemsHandler = jest.fn();
      dataSource.on("error", errorHandler);
      dataSource.on("items", itemsHandler);

      startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      const error = new Error("second failed");
      deferreds[1].reject(error);
      await expect(second).rejects.toBe(error);
      deferreds[0].resolve([item1]);
      await tick();

      expect(errorHandler.mock.calls).toEqual([[error]]);
      expect(itemsHandler).not.toHaveBeenCalled();
      expect(dataSource.items).toEqual([]);
    });
  });

  describe("signal", () => {
    test("The reader receives a signal, not aborted when the read is not superseded", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const reading = startRead(dataSource);
      await tick();
      expect(reader).toHaveBeenCalledWith({}, expect.any(AbortSignal));
      const signal = reader.mock.calls[0][1]!;
      expect(signal.aborted).toBe(false);
      deferreds[0].resolve([item1]);
      await reading;
      expect(signal.aborted).toBe(false);
    });
    test("The signal of a superseded read is aborted, the one of the latest read is not", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      const [firstSignal, secondSignal] = reader.mock.calls.map((a) => a[1]!);
      expect(firstSignal.aborted).toBe(true);
      expect(firstSignal.reason).toBeInstanceOf(AbortedException);
      expect(secondSignal.aborted).toBe(false);
      expect(secondSignal).not.toBe(firstSignal);
      deferreds[1].resolve([item2]);
      await second;
      expect(secondSignal.aborted).toBe(false);
    });
    test("getItemsBefore and getItemsAfter receive the same signal as the reader", async () => {
      const getItemsBefore = jest.fn(async (payload: DataSourcePayload<Item>) => payload);
      const getItemsAfter = jest.fn(async (items: Item[]) => items);
      const reader = jest.fn<Promise<Item[]>, Parameters<Reader>>(async () => [item1]);
      const dataSource = new DataSource<Item>(reader, [
        createStub({ getItemsAfter, getItemsBefore }),
      ]);
      await dataSource.read();
      const signal = reader.mock.calls[0][1];
      expect(signal).toEqual(expect.any(AbortSignal));
      expect(getItemsBefore).toHaveBeenCalledWith({}, signal);
      expect(getItemsAfter).toHaveBeenCalledWith([item1], {}, signal);
    });
    test("getItemsAfter of a superseded read is not called", async () => {
      const { deferreds, reader } = createDeferredReader();
      const getItemsAfter = jest.fn(async (items: Item[]) => items);
      const dataSource = new DataSource<Item>(reader, [
        createStub({ getItemsAfter }),
      ]);
      startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      deferreds[0].resolve([item1]);
      await tick();
      expect(getItemsAfter).not.toHaveBeenCalled();
      deferreds[1].resolve([item2]);
      await second;
      expect(getItemsAfter).toHaveBeenCalledTimes(1);
      expect(getItemsAfter.mock.calls[0][0]).toEqual([item2]);
    });
    test("A read superseded while getItemsAfter is pending does not call the next getItemsAfter", async () => {
      const afterA = createDeferred<Item[]>();
      const afterB = jest.fn(async (items: Item[]) => items);
      const reader = jest.fn<Promise<Item[]>, Parameters<Reader>>(async () => [item1]);
      const dataSource = new DataSource<Item>(reader, [
        createStub({ getItemsAfter: () => afterA.promise }),
        createStub({ getItemsAfter: afterB }),
      ]);
      const first = startRead(dataSource);
      await tick();
      await dataSource.dispose();
      afterA.resolve([item1]);
      await tick();
      await expect(first).rejects.toBeInstanceOf(AbortedException);
      expect(afterB).not.toHaveBeenCalled();
      expect(dataSource.items).toEqual([]);
    });
    test("PaginationExtension forwards the signal to the count reader", async () => {
      const countReader = jest.fn(
        async (_payload: DataSourcePayload<Item>, _signal?: AbortSignal) => 1,
      );
      const reader = jest.fn<Promise<Item[]>, Parameters<Reader>>(async () => [item1]);
      const paginating = new PaginationExtension<Item>(countReader, 10);
      const dataSource = new DataSource<Item>(reader, [paginating]);
      await dataSource.read();
      expect(countReader).toHaveBeenCalledTimes(1);
      const signal = reader.mock.calls[0][1];
      expect(signal).toEqual(expect.any(AbortSignal));
      expect(countReader.mock.calls[0][1]).toBe(signal);
    });
    test("PaginationExtension superseded while counting does not update the total count", async () => {
      const count = createDeferred<number>();
      const countReader = jest.fn(
        (_payload: DataSourcePayload<Item>, _signal?: AbortSignal) => count.promise,
      );
      const { deferreds, reader } = createDeferredReader();
      const paginating = new PaginationExtension<Item>(countReader, 10);
      const dataSource = new DataSource<Item>(reader, [paginating]);
      const totalHandler = jest.fn();
      paginating.on("totalItemsCount", totalHandler);

      startRead(dataSource);
      await tick();
      await dataSource.dispose();
      count.resolve(25);
      await tick();
      expect(paginating.totalItemsCount).toBe(0);
      expect(totalHandler).not.toHaveBeenCalled();
      expect(reader).not.toHaveBeenCalled();
      expect(deferreds).toHaveLength(0);
    });
  });

  describe("getItemsBefore pending", () => {
    test("A read superseded while getItemsBefore is pending does not call the reader", async () => {
      const befores: ReturnType<typeof createDeferred<DataSourcePayload<Item>>>[] = [];
      const getItemsBefore = jest.fn(() => {
        const deferred = createDeferred<DataSourcePayload<Item>>();
        befores.push(deferred);
        return deferred.promise;
      });
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader, [
        createStub({ getItemsBefore }),
      ]);

      const first = startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      expect(getItemsBefore).toHaveBeenCalledTimes(2);
      const firstPayload: DataSourcePayload<Item> = { distinct: true };
      const secondPayload: DataSourcePayload<Item> = { distinct: false };
      befores[0].resolve(firstPayload);
      await tick();
      expect(reader).not.toHaveBeenCalled();
      await expect(first).rejects.toBeInstanceOf(AbortedException);

      befores[1].resolve(secondPayload);
      await tick();
      expect(reader).toHaveBeenCalledTimes(1);
      expect(reader.mock.calls[0][0]).toBe(secondPayload);
      deferreds[0].resolve([item2]);
      await second;
      expect(dataSource.items).toEqual([item2]);
    });
  });

  describe("getItemsBefore pending, between two extensions", () => {
    test("A read superseded while getItemsBefore is pending does not call the next getItemsBefore", async () => {
      const beforeA = createDeferred<DataSourcePayload<Item>>();
      const beforeB = jest.fn(async (payload: DataSourcePayload<Item>) => payload);
      const { reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader, [
        createStub({ getItemsBefore: () => beforeA.promise }),
        createStub({ getItemsBefore: beforeB }),
      ]);
      const first = startRead(dataSource);
      await tick();
      await dataSource.dispose();
      beforeA.resolve({});
      await tick();
      await expect(first).rejects.toBeInstanceOf(AbortedException);
      expect(beforeB).not.toHaveBeenCalled();
      expect(reader).not.toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    test("During a read: read rejects with AbortedException and no items event is raised afterwards", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const itemsHandler = jest.fn();
      const isReadingHandler = jest.fn();
      dataSource.on("items", itemsHandler);
      dataSource.on("isReading", isReadingHandler);

      const reading = startRead(dataSource);
      await tick();
      await dataSource.dispose();
      await expect(reading).rejects.toBeInstanceOf(AbortedException);
      expect(reader.mock.calls[0][1]!.aborted).toBe(true);

      deferreds[0].resolve([item1]);
      await tick();
      expect(itemsHandler).not.toHaveBeenCalled();
      expect(dataSource.items).toEqual([]);
      expect(dataSource.isReading).toBe(false);
      expect(isReadingHandler.mock.calls).toEqual([[true]]);
    });
    test("Without a running read it does nothing more than before", async () => {
      const dataSource = new DataSource<Item>(async () => [item1]);
      await expect(dataSource.dispose()).resolves.toBeUndefined();
      expect(dataSource.isReading).toBe(false);
    });
  });

  describe("reusability", () => {
    test("A read requested after a failed one works", async () => {
      const reader = jest
        .fn<Promise<Item[]>, Parameters<Reader>>()
        .mockRejectedValueOnce(new Error("first failed"))
        .mockResolvedValueOnce([item1]);
      const dataSource = new DataSource<Item>(reader);
      const itemsHandler = jest.fn();
      dataSource.on("items", itemsHandler);
      await expect(dataSource.read()).rejects.toThrow("first failed");
      await dataSource.read();
      expect(dataSource.items).toEqual([item1]);
      expect(itemsHandler.mock.calls).toEqual([[[item1]]]);
      expect(dataSource.isReading).toBe(false);
    });
    test("A read requested after a superseded burst works and raises isReading again", async () => {
      const { deferreds, reader } = createDeferredReader();
      const dataSource = new DataSource<Item>(reader);
      const isReadingHandler = jest.fn();
      dataSource.on("isReading", isReadingHandler);

      startRead(dataSource);
      await tick();
      const second = startRead(dataSource);
      await tick();
      deferreds[1].resolve([item2]);
      await second;

      const third = startRead(dataSource);
      await tick();
      deferreds[2].resolve([item1]);
      await third;
      expect(dataSource.items).toEqual([item1]);
      expect(isReadingHandler.mock.calls).toEqual([
        [true],
        [false],
        [true],
        [false],
      ]);
    });
    test("Sequential reads, each awaited, behave as before", async () => {
      const reader = jest
        .fn<Promise<Item[]>, Parameters<Reader>>()
        .mockResolvedValueOnce([item1])
        .mockResolvedValueOnce([item2]);
      const dataSource = new DataSource<Item>(reader);
      const itemsHandler = jest.fn();
      dataSource.on("items", itemsHandler);
      await dataSource.read();
      await dataSource.read();
      expect(itemsHandler.mock.calls).toEqual([[[item1]], [[item2]]]);
      expect(dataSource.items).toEqual([item2]);
    });
  });
});
