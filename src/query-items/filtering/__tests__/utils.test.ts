import { FilterLogics, FilterOperators } from "../constants";
import {
  Filter,
  FiltersExpression,
  FiltersGroup,
  FiltersList,
} from "../types";
import { isFiltersGroup, isFiltersList } from "../utils";

type Item = { active: boolean; age: number; name: string };

const activeFilter: Filter<Item> = {
  field: "active",
  operator: FilterOperators.equal,
  value: true,
};

function getList(): FiltersList<Item> {
  return { filters: [activeFilter], logic: FilterLogics.and };
}
function getGroup(): FiltersGroup<Item> {
  return { groups: [getList()], logic: FilterLogics.or };
}

describe("QueryItems", () => {
  describe("filtering", () => {
    describe("utils", () => {
      describe("isFiltersList", () => {
        test("A { filters, logic } node is a list", () => {
          expect(isFiltersList(getList())).toBe(true);
        });
        test("A { groups, logic } node is not a list", () => {
          expect(isFiltersList(getGroup())).toBe(false);
        });
        test("An empty list is still a list", () => {
          const expression: FiltersExpression<Item> = {
            filters: [],
            logic: FilterLogics.and,
          };
          expect(isFiltersList(expression)).toBe(true);
        });
        test("Narrows the type to FiltersList", () => {
          const expression: FiltersExpression<Item> = getList();
          if (isFiltersList(expression)) {
            const list: FiltersList<Item> = expression;
            expect(list.filters).toEqual([activeFilter]);
            expect(list.logic).toBe(FilterLogics.and);
          } else {
            throw new Error("Expected a FiltersList");
          }
        });
      });

      describe("isFiltersGroup", () => {
        test("A { groups, logic } node is a group", () => {
          expect(isFiltersGroup(getGroup())).toBe(true);
        });
        test("A { filters, logic } node is not a group", () => {
          expect(isFiltersGroup(getList())).toBe(false);
        });
        test("An empty group is still a group", () => {
          const expression: FiltersExpression<Item> = {
            groups: [],
            logic: FilterLogics.and,
          };
          expect(isFiltersGroup(expression)).toBe(true);
        });
        test("Narrows the type to FiltersGroup", () => {
          const expression: FiltersExpression<Item> = getGroup();
          if (isFiltersGroup(expression)) {
            const group: FiltersGroup<Item> = expression;
            expect(group.groups).toEqual([getList()]);
            expect(group.logic).toBe(FilterLogics.or);
          } else {
            throw new Error("Expected a FiltersGroup");
          }
        });
      });
    });
  });
});
