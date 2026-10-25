import { Sort } from "../types";
import { addSort, removeSort } from "../utils";

type Item = { active: boolean; name: string };

const byActiveAsc: Sort<Item> = { field: "active", asc: true };
const byNameAsc: Sort<Item> = { field: "name", asc: true };
const byNameDesc: Sort<Item> = { field: "name", asc: false };

function getSorts(): Sort<Item>[] {
  return [byActiveAsc, byNameAsc];
}

describe("DataSource", () => {
  describe("extensions", () => {
    describe("sort", () => {
      describe("utils", () => {
        describe("addSort", () => {
          test("Add sort if existings doesn't involve the same key", () => {
            const sorts = addSort(byNameAsc, [byActiveAsc]);
            expect(sorts).toEqual([byActiveAsc, byNameAsc]);
          });
          test("Replaces existing sort with same field", () => {
            const sorts = addSort(byNameAsc, [byActiveAsc, byNameDesc]);
            expect(sorts).toEqual([byActiveAsc, byNameAsc]);
          });
          test("Sort is not added if sorts limit is reached", () => {
            const sorts = addSort(byNameAsc, [byActiveAsc], 1);
            expect(sorts).toEqual([byActiveAsc]);
          });
          test("Sort is added if sorts limit is reached, but an existing sort has the same field", () => {
            const sorts = addSort(byNameAsc, [byActiveAsc, byNameDesc], 2);
            expect(sorts).toEqual([byActiveAsc, byNameAsc]);
          });
        });
        describe("removeSort", () => {
          test("Sort is remove", () => {
            const sorts = removeSort(byNameAsc.field, getSorts());
            expect(sorts).toEqual([byActiveAsc]);
          });
        });
      });
    });
  });
});
