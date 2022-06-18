import { FilterOperators } from "@/browsing";
import { GenericItem } from "@/fake";

import {
  addFiltersToFiltersExpression,
  addFilterToFiltersExpression,
  clearFiltersFromFiltersExpression,
  filtersExpressionHasFilters,
  removeFilterFromFiltersExpression,
  removeFiltersByFieldFromFiltersExpression
} from "../utils";
import {
  FILTER_EMAIL,
  FILTER_FIRSTNAME,
  FILTER_FIRSTNAME_ALT,
  FILTER_LASTNAME
} from "./constants";
import { getFiltersExpression } from "./utils";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourceFilteringPlugin", () => {
      describe("utils", () => {
        describe("addFilterToFiltersExpression", () => {
          it("with OR 'operator', 'filter' is added to 'filtersExpression.filters'", () => {
            const filtersExpression = getFiltersExpression(
              [FILTER_FIRSTNAME],
              FilterOperators.or
            );
            addFilterToFiltersExpression(FILTER_LASTNAME, filtersExpression);
            expect(filtersExpression.filters).toEqual([
              FILTER_FIRSTNAME,
              FILTER_LASTNAME
            ]);
          });
          it("with AND 'operator' and without filter with same 'filter.field', 'filter' is added to 'filtersExpression.filters'", () => {
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            addFilterToFiltersExpression(FILTER_LASTNAME, filtersExpression);
            expect(filtersExpression.filters).toEqual([
              FILTER_FIRSTNAME,
              FILTER_LASTNAME
            ]);
          });
          it("with AND 'operator' and filter with same 'filter.field', existing 'filter' is removed and the new one appended", () => {
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            addFilterToFiltersExpression(
              FILTER_FIRSTNAME_ALT,
              filtersExpression
            );
            expect(filtersExpression.filters).toEqual([FILTER_FIRSTNAME_ALT]);
          });
        });
        describe("addFiltersToFiltersExpression", () => {
          it("with OR 'operator', 'filter' is added to 'filtersExpression.filters'", () => {
            const filtersExpression = getFiltersExpression(
              [FILTER_FIRSTNAME],
              FilterOperators.or
            );
            addFiltersToFiltersExpression(
              [FILTER_LASTNAME, FILTER_EMAIL],
              filtersExpression
            );
            expect(filtersExpression.filters).toEqual([
              FILTER_FIRSTNAME,
              FILTER_LASTNAME,
              FILTER_EMAIL
            ]);
          });
          it("with AND 'operator' and without filter with same 'filter.field', 'filter' is added to 'filtersExpression.filters'", () => {
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            addFiltersToFiltersExpression(
              [FILTER_LASTNAME, FILTER_EMAIL],
              filtersExpression
            );
            expect(filtersExpression.filters).toEqual([
              FILTER_FIRSTNAME,
              FILTER_LASTNAME,
              FILTER_EMAIL
            ]);
          });
          it("with AND 'operator' and filter with same 'filter.field', existing filter is removed and the new one appended", () => {
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            addFiltersToFiltersExpression(
              [FILTER_FIRSTNAME_ALT, FILTER_EMAIL],
              filtersExpression
            );
            expect(filtersExpression.filters).toEqual([
              FILTER_FIRSTNAME_ALT,
              FILTER_EMAIL
            ]);
          });
        });
        describe("filtersExpressionHasFilters", () => {
          it("has filters if it has at least one filter", () => {
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            const hasFilters = filtersExpressionHasFilters(filtersExpression);
            expect(hasFilters).toBeTruthy();
          });
          it("has filters if it has at least one child expression for which 'filtersExpressionHasFilters' returns true", () => {
            const filtersExpression = getFiltersExpression<GenericItem>([]);
            const childExpression = getFiltersExpression<GenericItem>([
              FILTER_FIRSTNAME
            ]);
            filtersExpression.childExpressions.push(childExpression);
            const hasFilters = filtersExpressionHasFilters(filtersExpression);
            expect(hasFilters).toBeTruthy();
          });
          it("has not filters if it hasn't filters or any child expression for which 'filtersExpressionHasFilters' returns true", () => {
            const filtersExpression = getFiltersExpression<GenericItem>([]);
            const childExpression = getFiltersExpression<GenericItem>([]);
            filtersExpression.childExpressions.push(childExpression);
            const hasFilters = filtersExpressionHasFilters(filtersExpression);
            expect(hasFilters).toBeFalsy();
          });
        });
        describe("clearFiltersFromFiltersExpression", () => {
          it("all filters and child expressions are removed", () => {
            const filtersExpression = getFiltersExpression([
              FILTER_FIRSTNAME,
              FILTER_LASTNAME
            ]);
            const childExpression = getFiltersExpression([
              FILTER_EMAIL,
              FILTER_FIRSTNAME_ALT
            ]);
            filtersExpression.childExpressions.push(childExpression);
            clearFiltersFromFiltersExpression(filtersExpression);
            expect(filtersExpression.childExpressions.length).toBe(0);
            expect(filtersExpression.filters.length).toBe(0);
          });
        });
        describe("removeFilterFromFiltersExpression", () => {
          it("filter is removed by reference", () => {
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            removeFilterFromFiltersExpression(
              FILTER_FIRSTNAME,
              filtersExpression
            );
            expect(filtersExpression.filters.length).toBe(0);
          });
          it("identical filters but different instance is not removed", () => {
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            removeFilterFromFiltersExpression(
              { ...FILTER_FIRSTNAME },
              filtersExpression
            );
            expect(filtersExpression.filters.length).toBe(1);
          });
        });
        describe("removeFiltersByFieldFromFiltersExpression", () => {
          it("all filters with the same 'field' value are removed", () => {
            const filtersExpression = getFiltersExpression([
              FILTER_FIRSTNAME,
              FILTER_FIRSTNAME_ALT
            ]);
            removeFiltersByFieldFromFiltersExpression(
              "firstName",
              filtersExpression
            );
            expect(filtersExpression.filters.length).toBe(0);
          });
        });
      });
    });
  });
});
