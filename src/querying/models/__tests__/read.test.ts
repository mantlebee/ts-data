import {
  getDataSourceAndPayload,
  getExpectedPayload,
} from "@/querying/__tests__/utils";

import { ReadStep } from "../read";

describe("Queryable", () => {
  describe("models", () => {
    describe("ReadStep", () => {
      describe("'read'", () => {
        it("Performs datasource read", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new ReadStep(dataSource).read();
          expect(getPayload()).toEqual(getExpectedPayload({}));
        });
      });
    });
  });
});
