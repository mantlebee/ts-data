import {
  getDataSourceAndPayload,
  getExpectedPayload,
} from "@/querying/__tests__/utils";

import { SortPartialStep } from "../sort";

describe("Queryable", () => {
  describe("models", () => {
    describe("SortPartialStep", () => {
      describe("'sortBy'", () => {
        it("Sorts asc by default", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SortPartialStep(dataSource).sortBy("age").read();
          expect(getPayload()).toEqual(
            getExpectedPayload({ sorts: [{ by: "age", asc: true }] })
          );
        });
        it("Sorts asc", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SortPartialStep(dataSource).sortBy("age").asc().read();
          expect(getPayload()).toEqual(
            getExpectedPayload({ sorts: [{ by: "age", asc: true }] })
          );
        });
        it("Sorts desc", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SortPartialStep(dataSource).sortBy("age").desc().read();
          expect(getPayload()).toEqual(
            getExpectedPayload({ sorts: [{ by: "age", asc: false }] })
          );
        });
        it("Uses the last inserted if more than one have the same key", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SortPartialStep(dataSource)
            .sortBy("age")
            .asc()
            .sortBy("age")
            .desc()
            .read();
          expect(getPayload()).toEqual(
            getExpectedPayload({ sorts: [{ by: "age", asc: false }] })
          );
        });
      });
      it("Supports iterations", async () => {
        const { dataSource, getPayload } = getDataSourceAndPayload();
        await new SortPartialStep(dataSource)
          .sortBy("lastName")
          .sortBy("firstName")
          .asc()
          .sortBy("marriedOn")
          .desc()
          .read();
        expect(getPayload()).toEqual(
          getExpectedPayload({
            sorts: [
              { by: "lastName", asc: true },
              { by: "firstName", asc: true },
              { by: "marriedOn", asc: false },
            ],
          })
        );
      });
    });
  });
});
