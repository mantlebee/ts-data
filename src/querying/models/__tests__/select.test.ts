import {
  getDataSourceAndPayload,
  getExpectedPayload,
} from "@/querying/__tests__/utils";

import { SelectPartialStep } from "../select";

describe("Queryable", () => {
  describe("models", () => {
    describe("SelectPartialStep", () => {
      describe("'add'", () => {
        it("Adds custom field with default value", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SelectPartialStep(dataSource).add(5).as("parentId").read();
          expect(getPayload()).toEqual(
            getExpectedPayload({
              selects: [{ alias: "parentId", defaultValue: 5 }],
            })
          );
        });
      });
      describe("'select'", () => {
        it("Adds one field to selection", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SelectPartialStep(dataSource).select("age").read();
          expect(getPayload()).toEqual(
            getExpectedPayload({
              selects: [{ alias: "age", key: "age" }],
            })
          );
        });
        it("Adds more fields to selection", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SelectPartialStep(dataSource).select("age", "badge").read();
          expect(getPayload()).toEqual(
            getExpectedPayload({
              selects: [
                { alias: "age", key: "age" },
                { alias: "badge", key: "badge" },
              ],
            })
          );
        });
        it("Adds a key with a different alias", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SelectPartialStep(dataSource)
            .select("badge")
            .as("Profile Image")
            .read();
          expect(getPayload()).toEqual(
            getExpectedPayload({
              selects: [{ alias: "Profile Image", key: "badge" }],
            })
          );
        });
        it("Passing multiple fields 'as' refers to the last one", async () => {
          const { dataSource, getPayload } = getDataSourceAndPayload();
          await new SelectPartialStep(dataSource)
            .select("age", "badge")
            .as("Profile Image")
            .read();
          expect(getPayload()).toEqual(
            getExpectedPayload({
              selects: [
                { alias: "age", key: "age" },
                { alias: "Profile Image", key: "badge" },
              ],
            })
          );
        });
      });
      it("Supports iterations", async () => {
        const { dataSource, getPayload } = getDataSourceAndPayload();
        await new SelectPartialStep(dataSource)
          .select("age")
          .as("Age")
          .select("avatar")
          .select("badge")
          .as("Profile Image")
          .add(5)
          .as("parentId")
          .read();
        expect(getPayload()).toEqual(
          getExpectedPayload({
            selects: [
              { alias: "Age", key: "age" },
              { alias: "avatar", key: "avatar" },
              { alias: "Profile Image", key: "badge" },
              { alias: "parentId", defaultValue: 5 },
            ],
          })
        );
      });
    });
  });
});
