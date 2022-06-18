import { calclulateTop } from "../utils";
import { ITEMS_PER_PAGE, SKIP, TOTAL_ITEMS_COUNT } from "./constants";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourcePaginationPlugin", () => {
      describe("utils", () => {
        it("'calculateTop'", async () => {
          const top = calclulateTop(TOTAL_ITEMS_COUNT, ITEMS_PER_PAGE, SKIP);
          expect(top).toBe(10);
        });
      });
    });
  });
});
