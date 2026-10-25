import { Sort } from "@/query-items";

import { DataSourcePayload } from "../../types";
import { SingleSortExtension, SortExtension } from "../models";

type Item = { active: boolean; age: number; name: string };

const byActiveAsc: Sort<Item> = { field: "active", asc: true };
const byAgeDesc: Sort<Item> = { field: "age", asc: false };
const byNameAsc: Sort<Item> = { field: "name", asc: true };
const byNameDesc: Sort<Item> = { field: "name", asc: false };

describe("DataSource", () => {
  describe("extensions", () => {
    describe("sorting", () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });
      afterEach(() => {
        jest.useRealTimers();
      });

      describe("SortExtension", () => {
        describe("sortsLimit", () => {
          test("Is null by default", () => {
            const extension = new SortExtension<Item>();
            expect(extension.sortsLimit).toBeNull();
          });
          test("Stays 0 when 0 is passed", () => {
            const extension = new SortExtension<Item>(0);
            expect(extension.sortsLimit).toBe(0);
          });
          test("Stays 2 when 2 is passed", () => {
            const extension = new SortExtension<Item>(2);
            expect(extension.sortsLimit).toBe(2);
          });
          test("Stays null when null is passed", () => {
            const extension = new SortExtension<Item>(null);
            expect(extension.sortsLimit).toBeNull();
          });
        });

        describe("hasSorts", () => {
          test("Is false with no sorts", () => {
            const extension = new SortExtension<Item>();
            expect(extension.hasSorts).toBe(false);
          });
          test("Is true with one sort", () => {
            const extension = new SortExtension<Item>();
            extension.addSort(byNameAsc);
            expect(extension.hasSorts).toBe(true);
          });
          test("Is true with two sorts", () => {
            const extension = new SortExtension<Item>();
            extension.addSort(byNameAsc);
            extension.addSort(byAgeDesc);
            expect(extension.hasSorts).toBe(true);
          });
        });

        describe("addSort", () => {
          test("Appends the sort and raises addSort with the sort and the sorts", () => {
            const extension = new SortExtension<Item>();
            const handler = jest.fn();
            extension.on("addSort", handler);
            extension.addSort(byNameAsc);
            extension.addSort(byAgeDesc);
            expect(extension.sorts).toEqual([byNameAsc, byAgeDesc]);
            expect(handler).toHaveBeenCalledTimes(2);
            expect(handler).toHaveBeenNthCalledWith(1, byNameAsc, [byNameAsc]);
            expect(handler).toHaveBeenNthCalledWith(2, byAgeDesc, [
              byNameAsc,
              byAgeDesc,
            ]);
          });
          test("Removes the existing sort on the same field and appends the new one", () => {
            const extension = new SortExtension<Item>();
            extension.setSorts([byNameDesc, byActiveAsc]);
            extension.addSort(byNameAsc);
            expect(extension.sorts).toEqual([byActiveAsc, byNameAsc]);
          });
          test("Does not add the sort when the limit is reached, but raises addSort with the unchanged sorts", () => {
            const extension = new SortExtension<Item>(1);
            extension.addSort(byActiveAsc);
            const handler = jest.fn();
            extension.on("addSort", handler);
            extension.addSort(byNameAsc);
            expect(extension.sorts).toEqual([byActiveAsc]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(byNameAsc, [byActiveAsc]);
          });
          test("Replaces the sort on the same field when the limit is reached", () => {
            const extension = new SortExtension<Item>(1);
            extension.addSort(byNameDesc);
            extension.addSort(byNameAsc);
            expect(extension.sorts).toEqual([byNameAsc]);
          });
          test("Never adds anything with sortsLimit 0", () => {
            const extension = new SortExtension<Item>(0);
            const handler = jest.fn();
            extension.on("addSort", handler);
            extension.addSort(byNameAsc);
            extension.addSort(byAgeDesc);
            expect(extension.sorts).toEqual([]);
            expect(extension.hasSorts).toBe(false);
            expect(handler).toHaveBeenCalledTimes(2);
            expect(handler).toHaveBeenLastCalledWith(byAgeDesc, []);
          });
        });

        describe("removeSort", () => {
          test("Removes the sort of the field and raises removeSort with the field and the sorts", () => {
            const extension = new SortExtension<Item>();
            extension.setSorts([byNameAsc, byAgeDesc]);
            const handler = jest.fn();
            extension.on("removeSort", handler);
            extension.removeSort("name");
            expect(extension.sorts).toEqual([byAgeDesc]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith("name", [byAgeDesc]);
          });
          test("Leaves the sorts untouched if the field has no sort", () => {
            const extension = new SortExtension<Item>();
            extension.setSorts([byNameAsc]);
            extension.removeSort("age");
            expect(extension.sorts).toEqual([byNameAsc]);
          });
        });

        describe("setSorts", () => {
          test("Replaces every sort and raises setSorts", () => {
            const extension = new SortExtension<Item>();
            extension.addSort(byActiveAsc);
            const handler = jest.fn();
            extension.on("setSorts", handler);
            extension.setSorts([byNameAsc, byAgeDesc]);
            expect(extension.sorts).toEqual([byNameAsc, byAgeDesc]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith([byNameAsc, byAgeDesc]);
          });
        });

        describe("clearSorts", () => {
          test("Empties the sorts and raises clearSorts without arguments", () => {
            const extension = new SortExtension<Item>();
            extension.setSorts([byNameAsc, byAgeDesc]);
            const handler = jest.fn();
            extension.on("clearSorts", handler);
            extension.clearSorts();
            expect(extension.sorts).toEqual([]);
            expect(extension.hasSorts).toBe(false);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith();
          });
        });

        describe("sortsChange", () => {
          test("Is raised once, after the default delay, following several quick mutations", () => {
            const extension = new SortExtension<Item>();
            const handler = jest.fn();
            extension.on("sortsChange", handler);
            extension.addSort(byNameAsc);
            extension.addSort(byAgeDesc);
            extension.removeSort("name");
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(99);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith([byAgeDesc], true);
          });
          test("Is raised with hasSorts false after clearSorts", () => {
            const extension = new SortExtension<Item>();
            const handler = jest.fn();
            extension.on("sortsChange", handler);
            extension.clearSorts();
            jest.advanceTimersByTime(100);
            expect(handler).toHaveBeenCalledWith([], false);
          });
          test("Respects the changeDelay option", () => {
            const extension = new SortExtension<Item>(null, {
              changeDelay: 300,
            });
            const handler = jest.fn();
            extension.on("sortsChange", handler);
            extension.addSort(byNameAsc);
            jest.advanceTimersByTime(299);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(handler).toHaveBeenCalledTimes(1);
          });
          test("Is not raised if the extension is disposed before the delay", async () => {
            const extension = new SortExtension<Item>();
            const handler = jest.fn();
            extension.on("sortsChange", handler);
            extension.addSort(byNameAsc);
            await extension.dispose();
            jest.advanceTimersByTime(1000);
            expect(handler).not.toHaveBeenCalled();
          });
        });

        describe("getItemsBefore", () => {
          test("Sets an empty list of sorts when there are no sorts", async () => {
            const extension = new SortExtension<Item>();
            const payload: DataSourcePayload<Item> = {};
            const result = await extension.getItemsBefore(payload);
            expect(result).toBe(payload);
            expect(result.sorts).toEqual([]);
          });
          test("Sets the sorts in the payload", async () => {
            const extension = new SortExtension<Item>();
            extension.setSorts([byNameAsc, byAgeDesc]);
            const payload: DataSourcePayload<Item> = {};
            const result = await extension.getItemsBefore(payload);
            expect(result).toBe(payload);
            expect(result.sorts).toEqual([byNameAsc, byAgeDesc]);
          });
        });
      });

      describe("SingleSortExtension", () => {
        test("sortsLimit is 1", () => {
          const extension = new SingleSortExtension<Item>();
          expect(extension.sortsLimit).toBe(1);
        });
        test("addSort on a different field replaces the current sort", () => {
          const extension = new SingleSortExtension<Item>();
          extension.addSort(byActiveAsc);
          extension.addSort(byNameAsc);
          expect(extension.sorts).toHaveLength(1);
          expect(extension.sorts).toEqual([byNameAsc]);
        });
        test("addSort on a different field raises exactly one addSort event", () => {
          const extension = new SingleSortExtension<Item>();
          extension.addSort(byActiveAsc);
          const handler = jest.fn();
          extension.on("addSort", handler);
          extension.addSort(byNameAsc);
          expect(handler).toHaveBeenCalledTimes(1);
          expect(handler).toHaveBeenCalledWith(byNameAsc, [byNameAsc]);
        });
        test("addSort on the same field replaces it", () => {
          const extension = new SingleSortExtension<Item>();
          extension.addSort(byNameDesc);
          extension.addSort(byNameAsc);
          expect(extension.sorts).toEqual([byNameAsc]);
        });
        test("sortsChange is raised once after several addSort calls", () => {
          const extension = new SingleSortExtension<Item>();
          const handler = jest.fn();
          extension.on("sortsChange", handler);
          extension.addSort(byActiveAsc);
          extension.addSort(byNameAsc);
          jest.advanceTimersByTime(100);
          expect(handler).toHaveBeenCalledTimes(1);
          expect(handler).toHaveBeenCalledWith([byNameAsc], true);
        });
        test("Respects the changeDelay option", () => {
          const extension = new SingleSortExtension<Item>({ changeDelay: 200 });
          const handler = jest.fn();
          extension.on("sortsChange", handler);
          extension.addSort(byNameAsc);
          jest.advanceTimersByTime(199);
          expect(handler).not.toHaveBeenCalled();
          jest.advanceTimersByTime(1);
          expect(handler).toHaveBeenCalledTimes(1);
        });
        test("getItemsBefore sets the single sort in the payload", async () => {
          const extension = new SingleSortExtension<Item>();
          extension.addSort(byActiveAsc);
          extension.addSort(byNameAsc);
          const result = await extension.getItemsBefore({});
          expect(result.sorts).toEqual([byNameAsc]);
        });
      });
    });
  });
});
