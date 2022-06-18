import { GenericItem } from "@/fake";

import { removeSort } from "../utils";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourceSortingPlugin", () => {
      describe("utils", () => {
        describe("removeSort", () => {
          it("Sort is removed", () => {
            const sorts = removeSort<GenericItem>(
              [
                { by: "firstName", asc: true },
                { by: "lastName", asc: true }
              ],
              "firstName"
            );
            expect(sorts.length).toBe(1);
          });
        });
      });
    });
  });
});
