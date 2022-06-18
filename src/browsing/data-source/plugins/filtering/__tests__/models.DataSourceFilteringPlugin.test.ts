import { FilterOperators } from "@/browsing";

import { getPayload } from "../../../__tests__";
import { FILTER_FIRSTNAME, FILTER_LASTNAME } from "./constants";
import { getDataSourceFiltering, getFiltersExpression } from "./utils";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourceFilteringPlugin", () => {
      describe("models", () => {
        describe("After initialization", () => {
          it("'filtersExpression' has no filters and default 'operator' is AND", () => {
            const filtering = getDataSourceFiltering();
            expect(filtering.hasFilters).toBeFalsy();
            expect(filtering.filtersExpression.operator).toBe(
              FilterOperators.and
            );
          });
        });
        describe("addFilter", () => {
          it("Without 'filtersExpression', 'this.filtersExpression' is used", async () => {
            const filtering = getDataSourceFiltering();
            filtering.addFilter(FILTER_FIRSTNAME);
            expect(filtering.filtersExpression.filters).toEqual([
              FILTER_FIRSTNAME
            ]);
          });
          it("With 'filtersExpression', 'this.filtersExpression' doesn't change", async () => {
            const filtering = getDataSourceFiltering();
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            filtering.addFilter(FILTER_LASTNAME, filtersExpression);
            expect(filtering.filtersExpression.filters).toEqual([]);
          });
        });
        describe("addFilters", () => {
          it("Without 'filtersExpression', 'this.filtersExpression' is used", async () => {
            const filtering = getDataSourceFiltering();
            filtering.addFilters([FILTER_FIRSTNAME, FILTER_LASTNAME]);
            expect(filtering.filtersExpression.filters).toEqual([
              FILTER_FIRSTNAME,
              FILTER_LASTNAME
            ]);
          });
          it("With 'filtersExpression', 'this.filtersExpression' doesn't change", async () => {
            const filtering = getDataSourceFiltering();
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            filtering.addFilters(
              [FILTER_FIRSTNAME, FILTER_LASTNAME],
              filtersExpression
            );
            expect(filtering.filtersExpression.filters).toEqual([]);
          });
        });
        describe("clearFilters", () => {
          it("Without 'filtersExpression', 'this.filtersExpression' is used", async () => {
            const filtering = getDataSourceFiltering();
            filtering.addFilters([FILTER_FIRSTNAME, FILTER_LASTNAME]);
            filtering.clearFilters();
            expect(filtering.hasFilters).toBeFalsy();
          });
          it("With 'filtersExpression', 'this.filtersExpression' doesn't change", async () => {
            const filtering = getDataSourceFiltering();
            const filtersExpression = getFiltersExpression([FILTER_FIRSTNAME]);
            filtering.addFilters([FILTER_FIRSTNAME, FILTER_LASTNAME]);
            filtering.clearFilters(filtersExpression);
            expect(filtering.hasFilters).toBeTruthy();
          });
        });
        describe("removeFilter", () => {
          it("Without 'filtersExpression', 'this.filtersExpression' is used", async () => {
            const filtering = getDataSourceFiltering();
            filtering.addFilters([FILTER_FIRSTNAME, FILTER_LASTNAME]);
            filtering.removeFilter(FILTER_FIRSTNAME);
            expect(filtering.filtersExpression.filters).toEqual([
              FILTER_LASTNAME
            ]);
          });
          it("With 'filtersExpression', 'this.filtersExpression' doesn't change", async () => {
            const filtering = getDataSourceFiltering();
            const filtersExpression = getFiltersExpression([
              FILTER_FIRSTNAME,
              FILTER_LASTNAME
            ]);
            filtering.removeFilter(FILTER_FIRSTNAME, filtersExpression);
            expect(filtering.filtersExpression.filters).toEqual([]);
          });
        });
        describe("Before read", () => {
          it("'payload.filters' is undefined if has not filters", async () => {
            const filtering = getDataSourceFiltering();
            let payload = getPayload();
            payload = await filtering.beforeRead(payload);
            expect(payload.filters).toBeUndefined();
          });
          it("'payload.filters' is equal to 'filtersExpression' if valorized", async () => {
            const filtering = getDataSourceFiltering();
            filtering.addFilter(FILTER_FIRSTNAME);
            let payload = getPayload();
            payload = await filtering.beforeRead(payload);
            expect(payload.filters).toBe(filtering.filtersExpression);
          });
        });
      });
    });
  });
});
