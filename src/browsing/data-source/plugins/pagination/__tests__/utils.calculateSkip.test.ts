import { calculateSkip } from "../utils";
import { ITEMS_PER_PAGE, TO_PAGE } from "./constants";

describe("DataSource", () => {
  describe("plugins", () => {
    describe("DataSourcePaginationPlugin", () => {
      describe("utils", () => {
        it("'calculateSkip'", async () => {
          const skip = calculateSkip(ITEMS_PER_PAGE, TO_PAGE);
          expect(skip).toBe(10);
        });
      });
    });
  });
});
