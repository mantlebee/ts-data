import { getPayload } from "../../../__tests__";
import { getDataSourceSorting } from "./utils";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourceSortPlugin", () => {
      describe("models", () => {
        describe("After initialization", () => {
          it("'sorts' is null", () => {
            const sorting = getDataSourceSorting();
            expect(sorting.sorts).toBeNull();
          });
        });
        describe("Before read", () => {
          it("'payload.sorts' is equal to 'sorts' if there are sorts", async () => {
            const sorting = getDataSourceSorting();
            sorting.sortBy("firstName");
            let payload = getPayload();
            payload = await sorting.beforeRead(payload);
            expect(payload.sorts).toEqual(sorting.sorts);
          });
          it("'payload.sorts' is undefined if there aren't sorts", async () => {
            const sorting = getDataSourceSorting();
            let payload = getPayload();
            payload = await sorting.beforeRead(payload);
            expect(payload.sorts).toBeUndefined();
          });
        });
      });
    });
  });
});
