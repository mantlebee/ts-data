import { Filter, FilterLogics, FilterOperators } from "@/query-items";

import { DataSourcePayload } from "../../types";
import { FilterExtension } from "../models";

type Item = { active: boolean; age: number; name: string };

const activeFilter: Filter<Item> = {
  field: "active",
  operator: FilterOperators.equal,
  value: true,
};
const ageMinFilter: Filter<Item> = {
  field: "age",
  operator: FilterOperators.greaterThanOrEqual,
  value: 18,
};
const ageMaxFilter: Filter<Item> = {
  field: "age",
  operator: FilterOperators.lessThan,
  value: 65,
};
const nameFilter: Filter<Item> = {
  field: "name",
  operator: FilterOperators.contains,
  value: "john",
};

describe("DataSource", () => {
  describe("extensions", () => {
    describe("filtering", () => {
      describe("FilterExtension", () => {
        beforeEach(() => {
          jest.useFakeTimers();
        });
        afterEach(() => {
          jest.useRealTimers();
        });

        describe("hasFilters", () => {
          test("Is false with no filters", () => {
            const extension = new FilterExtension<Item>();
            expect(extension.hasFilters).toBe(false);
          });
          test("Is true with one filter", () => {
            const extension = new FilterExtension<Item>();
            extension.addFilter(activeFilter);
            expect(extension.hasFilters).toBe(true);
          });
          test("Is true with two filters", () => {
            const extension = new FilterExtension<Item>();
            extension.addFilter(activeFilter);
            extension.addFilter(nameFilter);
            expect(extension.hasFilters).toBe(true);
          });
        });

        describe("logic", () => {
          test("Defaults to and", () => {
            const extension = new FilterExtension<Item>();
            expect(extension.logic).toBe(FilterLogics.and);
          });
          test("setLogic changes the logic and raises setLogic", () => {
            const extension = new FilterExtension<Item>();
            const handler = jest.fn();
            extension.on("setLogic", handler);
            extension.setLogic(FilterLogics.or);
            expect(extension.logic).toBe(FilterLogics.or);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(FilterLogics.or);
          });
        });

        describe("addFilter", () => {
          test("Adds the filter and raises addFilter with the filter and the filters", () => {
            const extension = new FilterExtension<Item>();
            const handler = jest.fn();
            extension.on("addFilter", handler);
            extension.addFilter(activeFilter);
            expect(extension.filters).toEqual([activeFilter]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(activeFilter, [activeFilter]);
          });
          test("Keeps both filters when added twice on the same field", () => {
            const extension = new FilterExtension<Item>();
            extension.addFilter(ageMinFilter);
            extension.addFilter(ageMaxFilter);
            expect(extension.filters).toEqual([ageMinFilter, ageMaxFilter]);
          });
        });

        describe("removeFilter", () => {
          test("Removes the filter by reference and raises removeFilter", () => {
            const extension = new FilterExtension<Item>();
            extension.setFilters([activeFilter, nameFilter]);
            const handler = jest.fn();
            extension.on("removeFilter", handler);
            extension.removeFilter(activeFilter);
            expect(extension.filters).toEqual([nameFilter]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(activeFilter, [nameFilter]);
          });
          test("Does not remove an equal but different object", () => {
            const extension = new FilterExtension<Item>();
            extension.addFilter(activeFilter);
            extension.removeFilter({ ...activeFilter });
            expect(extension.filters).toEqual([activeFilter]);
          });
        });

        describe("removeFiltersOf", () => {
          test("Removes every filter of the field, leaves the others and raises removeFiltersOf", () => {
            const extension = new FilterExtension<Item>();
            extension.setFilters([ageMinFilter, activeFilter, ageMaxFilter]);
            const handler = jest.fn();
            extension.on("removeFiltersOf", handler);
            extension.removeFiltersOf("age");
            expect(extension.filters).toEqual([activeFilter]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith("age", [activeFilter]);
          });
        });

        describe("replaceFiltersOf", () => {
          test("Removes the old filters of the field, appends the new ones and raises replaceFiltersOf", () => {
            const extension = new FilterExtension<Item>();
            extension.setFilters([ageMinFilter, activeFilter]);
            const handler = jest.fn();
            extension.on("replaceFiltersOf", handler);
            const f1: Filter<Item> = {
              field: "age",
              operator: FilterOperators.greaterThan,
              value: 20,
            };
            const f2: Filter<Item> = {
              field: "age",
              operator: FilterOperators.lessThanOrEqual,
              value: 30,
            };
            extension.replaceFiltersOf("age", f1, f2);
            expect(extension.filters).toEqual([activeFilter, f1, f2]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith("age", [activeFilter, f1, f2]);
          });
        });

        describe("setFilters", () => {
          test("Replaces every filter and raises setFilters", () => {
            const extension = new FilterExtension<Item>();
            extension.addFilter(activeFilter);
            const handler = jest.fn();
            extension.on("setFilters", handler);
            extension.setFilters([nameFilter, ageMinFilter]);
            expect(extension.filters).toEqual([nameFilter, ageMinFilter]);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith([nameFilter, ageMinFilter]);
          });
        });

        describe("clearFilters", () => {
          test("Empties the filters and raises clearFilters without arguments", () => {
            const extension = new FilterExtension<Item>();
            extension.setFilters([activeFilter, nameFilter]);
            const handler = jest.fn();
            extension.on("clearFilters", handler);
            extension.clearFilters();
            expect(extension.filters).toEqual([]);
            expect(extension.hasFilters).toBe(false);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith();
          });
        });

        describe("filtersChange", () => {
          test("Is raised once, after the default delay, following several quick mutations", () => {
            const extension = new FilterExtension<Item>();
            const handler = jest.fn();
            extension.on("filtersChange", handler);
            extension.addFilter(activeFilter);
            extension.addFilter(nameFilter);
            extension.removeFilter(activeFilter);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(99);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith([nameFilter], true);
          });
          test("Restarts the wait at every mutation", () => {
            const extension = new FilterExtension<Item>();
            const handler = jest.fn();
            extension.on("filtersChange", handler);
            extension.addFilter(activeFilter);
            jest.advanceTimersByTime(60);
            extension.addFilter(nameFilter);
            jest.advanceTimersByTime(60);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(40);
            expect(handler).toHaveBeenCalledTimes(1);
          });
          test("Is raised with hasFilters false after clearFilters", () => {
            const extension = new FilterExtension<Item>();
            const handler = jest.fn();
            extension.on("filtersChange", handler);
            extension.clearFilters();
            jest.advanceTimersByTime(100);
            expect(handler).toHaveBeenCalledWith([], false);
          });
          test("Respects the changeDelay option", () => {
            const extension = new FilterExtension<Item>({ changeDelay: 500 });
            const handler = jest.fn();
            extension.on("filtersChange", handler);
            extension.addFilter(activeFilter);
            jest.advanceTimersByTime(499);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(handler).toHaveBeenCalledTimes(1);
          });
          test("Is not raised if the extension is disposed before the delay", async () => {
            const extension = new FilterExtension<Item>();
            const handler = jest.fn();
            extension.on("filtersChange", handler);
            extension.addFilter(activeFilter);
            await extension.dispose();
            jest.advanceTimersByTime(1000);
            expect(handler).not.toHaveBeenCalled();
          });
          test("Is not raised by setLogic", () => {
            const extension = new FilterExtension<Item>();
            const handler = jest.fn();
            extension.on("filtersChange", handler);
            extension.setLogic(FilterLogics.or);
            jest.advanceTimersByTime(1000);
            expect(handler).not.toHaveBeenCalled();
          });
        });

        describe("getItemsBefore", () => {
          test("Does not add the filters key to the payload when there are no filters", async () => {
            const extension = new FilterExtension<Item>();
            const payload: DataSourcePayload<Item> = {};
            const result = await extension.getItemsBefore(payload);
            expect(result).toBe(payload);
            expect("filters" in result).toBe(false);
          });
          test("Adds a FiltersList with filters and logic to the payload", async () => {
            const extension = new FilterExtension<Item>();
            extension.setFilters([activeFilter, nameFilter]);
            const payload: DataSourcePayload<Item> = {};
            const result = await extension.getItemsBefore(payload);
            expect(result).toBe(payload);
            expect(result.filters).toEqual({
              filters: [activeFilter, nameFilter],
              logic: FilterLogics.and,
            });
          });
          test("Uses the current logic", async () => {
            const extension = new FilterExtension<Item>();
            extension.addFilter(activeFilter);
            extension.setLogic(FilterLogics.or);
            const result = await extension.getItemsBefore({});
            expect(result.filters).toEqual({
              filters: [activeFilter],
              logic: FilterLogics.or,
            });
          });
        });
      });
    });
  });
});
