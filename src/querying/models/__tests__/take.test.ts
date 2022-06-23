import {
  getDataSourceAndPayload,
  getExpectedPayload,
} from "@/querying/__tests__/utils";

import { TakePartialStep } from "../take";

describe("Queryable", () => {
  describe("models", () => {
    describe("TakePartialStep", () => {
      describe("'take'", () => {
        it("Defines top", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new TakePartialStep(dataSource).take(20).read();
          expect(getPayload()).toEqual(getExpectedPayload({ top: 20 }));
        });
        it("Defines top and skip", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new TakePartialStep(dataSource).take(20).startingFrom(5).read();
          expect(getPayload()).toEqual(
            getExpectedPayload({ skip: 5, top: 20 })
          );
        });
      });
      describe("'takeAll'", () => {
        it("Defines skip", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new TakePartialStep(dataSource)
            .takeAll()
            .startingFrom(5)
            .read();
          expect(getPayload()).toEqual(getExpectedPayload({ skip: 5 }));
        });
      });
    });
  });
});
