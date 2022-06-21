import { List } from "@mantlebee/ts-core";

import { Sort } from "@/browsing";
import { GenericItem } from "@/fake";

import { sortBy } from "../utils";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourceSortPlugin", () => {
      describe("utils", () => {
        describe("sortBy", () => {
          it("Sort is added at last position if no sort with same 'by' is present", () => {
            let sorts: List<Sort<GenericItem>> = [
              { by: "firstName", asc: true },
            ];
            sorts = sortBy<GenericItem>(sorts, "lastName", true);
            expect(sorts.length).toBe(2);
            expect(sorts.pop()).toEqual({ by: "lastName", asc: true });
          });
          it("Existing sort with same 'by' is replaced", () => {
            let sorts: List<Sort<GenericItem>> = [
              { by: "firstName", asc: true },
            ];
            sorts = sortBy<GenericItem>(sorts, "firstName", false);
            expect(sorts.length).toBe(1);
            expect(sorts[0]).toEqual({ by: "firstName", asc: false });
          });
        });
      });
    });
  });
});
