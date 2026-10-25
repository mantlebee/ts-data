import { DataSource, DataSourceExtension } from "../../models";
import { DataSourcePayload } from "../../types";
import { PaginationExtension } from "../models";

type Item = { id: number };

function createExtension(
  total: number,
  itemsPerPage: number,
  itemsPerPageOptions?: number[],
) {
  const state = { total };
  const reader = jest.fn(
    async (_payload: DataSourcePayload<Item>) => state.total,
  );
  const extension = new PaginationExtension<Item>(
    reader,
    itemsPerPage,
    itemsPerPageOptions,
  );
  const read = (): Promise<DataSourcePayload<Item>> =>
    extension.getItemsBefore({});
  return { extension, read, reader, state };
}

async function createReadExtension(
  total: number,
  itemsPerPage: number,
  itemsPerPageOptions?: number[],
) {
  const context = createExtension(total, itemsPerPage, itemsPerPageOptions);
  await context.read();
  return context;
}

describe("PaginationExtension", () => {
  describe("initial state", () => {
    test("Starts from the first page with no items", () => {
      const { extension } = createExtension(0, 10);
      expect(extension.page).toBe(1);
      expect(extension.totalItemsCount).toBe(0);
      expect(extension.lastPage).toBe(1);
    });
    test("Cannot go to previous or next page", () => {
      const { extension } = createExtension(0, 10);
      expect(extension.canGoPreviousPage).toBe(false);
      expect(extension.canGoNextPage).toBe(false);
    });
    test("Exposes the given items per page", () => {
      const { extension } = createExtension(0, 15);
      expect(extension.itemsPerPage).toBe(15);
    });
    test("Items per page options are undefined when not given", () => {
      const { extension } = createExtension(0, 10);
      expect(extension.itemsPerPageOptions).toBeUndefined();
    });
    test("Exposes the given items per page options", () => {
      const options = [10, 20];
      const { extension } = createExtension(0, 10, options);
      expect(extension.itemsPerPageOptions).toBe(options);
    });
    test("Does not call the count reader until the first read", () => {
      const { reader } = createExtension(0, 10);
      expect(reader).not.toHaveBeenCalled();
    });
  });

  describe("constructor", () => {
    test.each([0, -1, 1.5, NaN])(
      "Throws when items per page is %p",
      (itemsPerPage) => {
        expect(() => createExtension(0, itemsPerPage)).toThrow();
      },
    );
    test("Throws when items per page is not one of the options", () => {
      expect(() => createExtension(0, 15, [10, 20])).toThrow();
    });
    test("Does not throw when items per page is one of the options", () => {
      expect(() => createExtension(0, 10, [10, 20])).not.toThrow();
    });
  });

  describe("getItemsBefore", () => {
    test("Calls the count reader with the payload", async () => {
      const { extension, reader } = createExtension(25, 10);
      const payload: DataSourcePayload<Item> = {};
      await extension.getItemsBefore(payload);
      expect(reader).toHaveBeenCalledTimes(1);
      expect(reader).toHaveBeenCalledWith(payload);
    });
    test("Stores the total items count", async () => {
      const { extension } = await createReadExtension(25, 10);
      expect(extension.totalItemsCount).toBe(25);
    });
    test("Raises the totalItemsCount event with the new value", async () => {
      const { extension, read } = createExtension(25, 10);
      const handler = jest.fn();
      extension.on("totalItemsCount", handler);
      await read();
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(25);
    });
    test("Sets the paging of the payload", async () => {
      const { extension } = createExtension(25, 10);
      const payload: DataSourcePayload<Item> = {};
      await extension.getItemsBefore(payload);
      expect(payload.paging).toEqual({
        itemsPerPage: 10,
        page: 1,
        totalItemsCount: 25,
      });
    });
    test("Returns the same payload object", async () => {
      const { extension } = createExtension(25, 10);
      const payload: DataSourcePayload<Item> = {};
      const result = await extension.getItemsBefore(payload);
      expect(result).toBe(payload);
    });
    test("Does not raise totalItemsCount again when the count is the same", async () => {
      const { extension, read } = createExtension(25, 10);
      const handler = jest.fn();
      extension.on("totalItemsCount", handler);
      await read();
      await read();
      expect(handler).toHaveBeenCalledTimes(1);
    });
    test("Raises totalItemsCount again when the count is different", async () => {
      const { extension, read, state } = createExtension(25, 10);
      const handler = jest.fn();
      extension.on("totalItemsCount", handler);
      await read();
      state.total = 30;
      await read();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenLastCalledWith(30);
    });
    test("Does not raise totalItemsCount when the first count is 0", async () => {
      const { extension, read } = createExtension(0, 10);
      const handler = jest.fn();
      extension.on("totalItemsCount", handler);
      await read();
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("lastPage", () => {
    test.each([
      [0, 10, 1],
      [10, 10, 1],
      [11, 10, 2],
      [25, 10, 3],
      [100, 20, 5],
    ])(
      "With total %p and %p items per page the last page is %p",
      async (total, itemsPerPage, expected) => {
        const { extension } = await createReadExtension(total, itemsPerPage);
        expect(extension.lastPage).toBe(expected);
      },
    );
  });

  describe("navigation", () => {
    test("goToNextPage moves forward up to the last page and then stays there", async () => {
      const { extension } = await createReadExtension(25, 10);
      const handler = jest.fn();
      extension.on("page", handler);
      extension.goToNextPage();
      expect(extension.page).toBe(2);
      extension.goToNextPage();
      expect(extension.page).toBe(3);
      extension.goToNextPage();
      expect(extension.page).toBe(3);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, 2);
      expect(handler).toHaveBeenNthCalledWith(2, 3);
    });
    test("goToPreviousPage moves back down to the first page and then stays there", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToLastPage();
      const handler = jest.fn();
      extension.on("page", handler);
      extension.goToPreviousPage();
      expect(extension.page).toBe(2);
      extension.goToPreviousPage();
      expect(extension.page).toBe(1);
      extension.goToPreviousPage();
      expect(extension.page).toBe(1);
      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, 2);
      expect(handler).toHaveBeenNthCalledWith(2, 1);
    });
    test("goToLastPage goes to the last page", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToLastPage();
      expect(extension.page).toBe(3);
    });
    test("goToFirstPage goes to the first page", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToLastPage();
      extension.goToFirstPage();
      expect(extension.page).toBe(1);
    });
    test("canGoNextPage and canGoPreviousPage on the first page", async () => {
      const { extension } = await createReadExtension(25, 10);
      expect(extension.canGoPreviousPage).toBe(false);
      expect(extension.canGoNextPage).toBe(true);
    });
    test("canGoNextPage and canGoPreviousPage on a middle page", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToPage(2);
      expect(extension.canGoPreviousPage).toBe(true);
      expect(extension.canGoNextPage).toBe(true);
    });
    test("canGoNextPage and canGoPreviousPage on the last page", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToLastPage();
      expect(extension.canGoPreviousPage).toBe(true);
      expect(extension.canGoNextPage).toBe(false);
    });
  });

  describe("goToPage", () => {
    test("Goes to a page in range", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToPage(2);
      expect(extension.page).toBe(2);
    });
    test.each([
      [0, 1],
      [-5, 1],
      [999, 3],
      [2.7, 2],
      [NaN, 1],
    ])("Clamps %p to %p", async (target, expected) => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToPage(2);
      extension.goToPage(target);
      expect(extension.page).toBe(expected);
    });
    test("Raises page with the clamped value", async () => {
      const { extension } = await createReadExtension(25, 10);
      const handler = jest.fn();
      extension.on("page", handler);
      extension.goToPage(999);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(3);
    });
    test("Raises page with the truncated value", async () => {
      const { extension } = await createReadExtension(25, 10);
      const handler = jest.fn();
      extension.on("page", handler);
      extension.goToPage(2.7);
      expect(handler).toHaveBeenCalledWith(2);
    });
    test("Does not raise page when the target is the current page", async () => {
      const { extension } = await createReadExtension(25, 10);
      const handler = jest.fn();
      extension.on("page", handler);
      extension.goToPage(1);
      expect(handler).not.toHaveBeenCalled();
    });
    test("Does not raise page when the clamped target is the current page", async () => {
      const { extension } = await createReadExtension(25, 10);
      const handler = jest.fn();
      extension.on("page", handler);
      extension.goToPage(-5);
      expect(handler).not.toHaveBeenCalled();
    });
    test("Cannot leave the first page before the first read", () => {
      const { extension } = createExtension(25, 10);
      extension.goToPage(3);
      expect(extension.page).toBe(1);
    });
  });

  describe("setItemsPerPage", () => {
    test("Updates items per page and raises itemsPerPage", async () => {
      const { extension } = await createReadExtension(25, 10);
      const handler = jest.fn();
      extension.on("itemsPerPage", handler);
      extension.setItemsPerPage(5);
      expect(extension.itemsPerPage).toBe(5);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(5);
    });
    test("Does not raise itemsPerPage when the value is the same", () => {
      const { extension } = createExtension(25, 10);
      const handler = jest.fn();
      extension.on("itemsPerPage", handler);
      extension.setItemsPerPage(10);
      expect(handler).not.toHaveBeenCalled();
    });
    test.each([0, -1, 1.5, NaN])(
      "Throws and changes nothing when the value is %p",
      (value) => {
        const { extension } = createExtension(25, 10);
        const handler = jest.fn();
        extension.on("itemsPerPage", handler);
        expect(() => extension.setItemsPerPage(value)).toThrow();
        expect(extension.itemsPerPage).toBe(10);
        expect(handler).not.toHaveBeenCalled();
      },
    );
    test("Throws and changes nothing when the value is not in the options", () => {
      const { extension } = createExtension(25, 10, [10, 20]);
      const handler = jest.fn();
      extension.on("itemsPerPage", handler);
      expect(() => extension.setItemsPerPage(15)).toThrow();
      expect(extension.itemsPerPage).toBe(10);
      expect(handler).not.toHaveBeenCalled();
    });
    test("Accepts a value that is in the options", () => {
      const { extension } = createExtension(25, 10, [10, 20]);
      extension.setItemsPerPage(20);
      expect(extension.itemsPerPage).toBe(20);
    });
    test("Re-clamps the page when the last page gets lower than it", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToLastPage();
      const pageHandler = jest.fn();
      extension.on("page", pageHandler);
      extension.setItemsPerPage(20);
      expect(extension.lastPage).toBe(2);
      expect(extension.page).toBe(2);
      expect(pageHandler).toHaveBeenCalledTimes(1);
      expect(pageHandler).toHaveBeenCalledWith(2);
    });
    test("Does not raise page when the current page is still valid", async () => {
      const { extension } = await createReadExtension(25, 10);
      extension.goToPage(2);
      const pageHandler = jest.fn();
      extension.on("page", pageHandler);
      extension.setItemsPerPage(5);
      expect(extension.page).toBe(2);
      expect(pageHandler).not.toHaveBeenCalled();
    });
  });

  describe("count change", () => {
    test("Re-clamps the page when the new count has fewer pages", async () => {
      const { extension, read, state } = await createReadExtension(25, 10);
      extension.goToLastPage();
      const handler = jest.fn();
      extension.on("page", handler);
      state.total = 5;
      await read();
      expect(extension.page).toBe(1);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(1);
    });
    test("Sends the re-clamped page in the payload", async () => {
      const { extension, state } = await createReadExtension(25, 10);
      extension.goToLastPage();
      state.total = 5;
      const payload = await extension.getItemsBefore({});
      expect(payload.paging).toEqual({
        itemsPerPage: 10,
        page: 1,
        totalItemsCount: 5,
      });
    });
    test("Keeps the page when it is still valid with the new count", async () => {
      const { extension, read, state } = await createReadExtension(25, 10);
      extension.goToPage(2);
      const handler = jest.fn();
      extension.on("page", handler);
      state.total = 100;
      await read();
      expect(extension.page).toBe(2);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("count reader rejection", () => {
    test("getItemsBefore rejects with the reader error", async () => {
      const error = new Error("count failed");
      const extension = new PaginationExtension<Item>(
        jest.fn(async () => {
          throw error;
        }),
        10,
      );
      await expect(extension.getItemsBefore({})).rejects.toBe(error);
    });
    test("DataSource.read rejects and the items reader is not called", async () => {
      const error = new Error("count failed");
      const paginating = new PaginationExtension<Item>(
        jest.fn(async () => {
          throw error;
        }),
        10,
      );
      const itemsReader = jest.fn(async () => [] as Item[]);
      const dataSource = new DataSource<Item>(itemsReader, [paginating]);
      await expect(dataSource.read()).rejects.toBe(error);
      expect(itemsReader).not.toHaveBeenCalled();
    });
    test("DataSource.read passes the paging to the items reader", async () => {
      const { extension } = createExtension(25, 10);
      const itemsReader = jest.fn(
        async (_payload: DataSourcePayload<Item>) => [{ id: 1 }],
      );
      const dataSource = new DataSource<Item>(itemsReader, [extension]);
      await dataSource.read();
      expect(itemsReader).toHaveBeenCalledTimes(1);
      expect(itemsReader.mock.calls[0][0].paging).toEqual({
        itemsPerPage: 10,
        page: 1,
        totalItemsCount: 25,
      });
    });
  });

  describe("extension", () => {
    test("Extends DataSourceExtension", () => {
      const { extension } = createExtension(0, 10);
      expect(extension).toBeInstanceOf(DataSourceExtension);
    });
    test("dispose resolves", async () => {
      const { extension } = createExtension(0, 10);
      await expect(extension.dispose()).resolves.toBeUndefined();
    });
    test("Handlers are no longer invoked after dispose", async () => {
      const { extension, read } = await createReadExtension(25, 10);
      const pageHandler = jest.fn();
      const totalHandler = jest.fn();
      const perPageHandler = jest.fn();
      extension.on("page", pageHandler);
      extension.on("totalItemsCount", totalHandler);
      extension.on("itemsPerPage", perPageHandler);
      await extension.dispose();
      extension.goToNextPage();
      extension.setItemsPerPage(5);
      await read();
      expect(pageHandler).not.toHaveBeenCalled();
      expect(perPageHandler).not.toHaveBeenCalled();
      expect(totalHandler).not.toHaveBeenCalled();
    });
  });
});
