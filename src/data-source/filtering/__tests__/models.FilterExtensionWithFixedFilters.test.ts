import {
  Filter,
  FilterLogics,
  FilterOperators,
  FiltersExpression,
} from "@/query-items";

import { DataSourcePayload } from "../../types";
import { FilterExtensionWithFixedFilters } from "../models";

type Item = { active: boolean; age: number; name: string };

const activeFilter: Filter<Item> = {
  field: "active",
  operator: FilterOperators.equal,
  value: true,
};
const ageFilter: Filter<Item> = {
  field: "age",
  operator: FilterOperators.greaterThanOrEqual,
  value: 18,
};
const nameFilter: Filter<Item> = {
  field: "name",
  operator: FilterOperators.startsWith,
  value: "j",
};

function getFixedFilters(): FiltersExpression<Item> {
  return { filters: [activeFilter], logic: FilterLogics.and };
}

describe("DataSource", () => {
  describe("extensions", () => {
    describe("filtering", () => {
      describe("FilterExtensionWithFixedFilters", () => {
        beforeEach(() => {
          jest.useFakeTimers();
        });
        afterEach(() => {
          jest.useRealTimers();
        });

        describe("getters", () => {
          test("fixedFilters returns the expression passed to the constructor", () => {
            const fixedFilters = getFixedFilters();
            const extension = new FilterExtensionWithFixedFilters<Item>(
              fixedFilters,
            );
            expect(extension.fixedFilters).toBe(fixedFilters);
          });
          test("groupsLogic defaults to and", () => {
            const extension = new FilterExtensionWithFixedFilters<Item>(
              getFixedFilters(),
            );
            expect(extension.groupsLogic).toBe(FilterLogics.and);
          });
          test("groupsLogic returns the option", () => {
            const extension = new FilterExtensionWithFixedFilters<Item>(
              getFixedFilters(),
              { groupsLogic: FilterLogics.or },
            );
            expect(extension.groupsLogic).toBe(FilterLogics.or);
          });
          test("The user logic still defaults to and, even with groupsLogic or", () => {
            const extension = new FilterExtensionWithFixedFilters<Item>(
              getFixedFilters(),
              { groupsLogic: FilterLogics.or },
            );
            expect(extension.logic).toBe(FilterLogics.and);
          });
          test("The fixed filters are not counted as user filters", () => {
            const extension = new FilterExtensionWithFixedFilters<Item>(
              getFixedFilters(),
            );
            expect(extension.hasFilters).toBe(false);
            expect(extension.filters).toEqual([]);
          });
        });

        describe("getItemsBefore", () => {
          test("Puts exactly the fixed expression in the payload when there are no user filters", async () => {
            const fixedFilters = getFixedFilters();
            const extension = new FilterExtensionWithFixedFilters<Item>(
              fixedFilters,
            );
            const payload: DataSourcePayload<Item> = {};
            const result = await extension.getItemsBefore(payload);
            expect(result).toBe(payload);
            expect(result.filters).toBe(fixedFilters);
            expect(result.filters).toEqual(getFixedFilters());
          });
          test("Groups the fixed expression and the user filters with and by default", async () => {
            const fixedFilters = getFixedFilters();
            const extension = new FilterExtensionWithFixedFilters<Item>(
              fixedFilters,
            );
            extension.setFilters([ageFilter, nameFilter]);
            const result = await extension.getItemsBefore({});
            expect(result.filters).toEqual({
              groups: [
                fixedFilters,
                {
                  filters: [ageFilter, nameFilter],
                  logic: FilterLogics.and,
                },
              ],
              logic: FilterLogics.and,
            });
          });
          test("Uses the groupsLogic option as the outer logic", async () => {
            const fixedFilters = getFixedFilters();
            const extension = new FilterExtensionWithFixedFilters<Item>(
              fixedFilters,
              { groupsLogic: FilterLogics.or },
            );
            extension.addFilter(ageFilter);
            const result = await extension.getItemsBefore({});
            expect(result.filters).toEqual({
              groups: [
                fixedFilters,
                { filters: [ageFilter], logic: FilterLogics.and },
              ],
              logic: FilterLogics.or,
            });
          });
          test("The user logic is the logic of the inner list, not of the outer group", async () => {
            const fixedFilters = getFixedFilters();
            const extension = new FilterExtensionWithFixedFilters<Item>(
              fixedFilters,
            );
            extension.addFilter(ageFilter);
            extension.setLogic(FilterLogics.or);
            const result = await extension.getItemsBefore({});
            expect(result.filters).toEqual({
              groups: [
                fixedFilters,
                { filters: [ageFilter], logic: FilterLogics.or },
              ],
              logic: FilterLogics.and,
            });
          });
          test("Goes back to the fixed expression only after clearFilters", async () => {
            const fixedFilters = getFixedFilters();
            const extension = new FilterExtensionWithFixedFilters<Item>(
              fixedFilters,
            );
            extension.addFilter(ageFilter);
            extension.clearFilters();
            const result = await extension.getItemsBefore({});
            expect(result.filters).toBe(fixedFilters);
          });
        });

        describe("filtersChange", () => {
          test("Is debounced and respects changeDelay", () => {
            const extension = new FilterExtensionWithFixedFilters<Item>(
              getFixedFilters(),
              { changeDelay: 250 },
            );
            const handler = jest.fn();
            extension.on("filtersChange", handler);
            extension.addFilter(ageFilter);
            jest.advanceTimersByTime(249);
            expect(handler).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1);
            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith([ageFilter], true);
          });
        });
      });
    });
  });
});
