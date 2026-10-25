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
          test("Sorts limit 0 is unlimited", () => {
            const sorts = addSort(byNameAsc, [byActiveAsc], 0);
            expect(sorts).toEqual([byActiveAsc, byNameAsc]);
          });
          test("Sorts limit undefined is unlimited", () => {
            const sorts = addSort(byNameAsc, [byActiveAsc], undefined);
            expect(sorts).toEqual([byActiveAsc, byNameAsc]);
          });
          test("Sort on an existing field is replaced if sorts limit is 0", () => {
            const sorts = addSort(byNameAsc, [byNameDesc], 0);
            expect(sorts).toEqual([byNameAsc]);
          });
          test("Sort is added if sorts limit is not reached", () => {
            const sorts = addSort(byNameAsc, [byActiveAsc], 2);
            expect(sorts).toEqual([byActiveAsc, byNameAsc]);
          });
          test("Sort replaces the existing one with the same field if sorts limit is 1", () => {
            const sorts = addSort(byNameAsc, [byNameDesc], 1);
            expect(sorts).toEqual([byNameAsc]);
          });
          test("Replaced sort is moved to the end", () => {
            const sorts = addSort(byActiveAsc, [byActiveAsc, byNameAsc]);
            expect(sorts).toEqual([byNameAsc, byActiveAsc]);
          });
          test("Existing sorts are left untouched", () => {
            const existing = getSorts();
            addSort(byNameDesc, existing);
            expect(existing).toEqual(getSorts());
          });
        });
        describe("removeSort", () => {
          test("Sort is remove", () => {
            const sorts = removeSort(byNameAsc.field, getSorts());
            expect(sorts).toEqual([byActiveAsc]);
          });
          test("Sorts are untouched if no sort has the field", () => {
            const sorts = removeSort("age" as never, getSorts());
            expect(sorts).toEqual(getSorts());
          });
          test("Existing sorts are left untouched", () => {
            const existing = getSorts();
            removeSort(byNameAsc.field, existing);
            expect(existing).toEqual(getSorts());
          });
        });
      });
    });
  });
});
