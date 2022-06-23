import { FilterOperations, FilterOperators } from "@/browsing";
import { onWhere } from "@/querying/utils";
import {
  getDataSourceAndPayload,
  getExpectedPayload,
} from "@/querying/__tests__/utils";

import { WherePartialStep } from "../where";

describe("Queryable", () => {
  describe("models", () => {
    describe("WherePartialStep", () => {
      it("Supports iterations", async () => {
        const { dataSource, getPayload } = getDataSourceAndPayload();
        const filtersExpression = onWhere(dataSource.filterPlugin);
        await new WherePartialStep(dataSource, "age", filtersExpression)
          .isLessThan(18)
          .and("married")
          .isFalse()
          .or("married")
          .isTrue()
          .and("gender")
          .isEqualTo(1)
          .read();
        expect(getPayload()).toEqual(
          getExpectedPayload({
            filters: {
              childExpressions: [
                {
                  childExpressions: [],
                  filters: [
                    {
                      field: "age",
                      operation: FilterOperations.lessThan,
                      value: 18,
                    },
                    {
                      field: "married",
                      operation: FilterOperations.equal,
                      value: false,
                    },
                  ],
                  operator: FilterOperators.and,
                },
                {
                  childExpressions: [],
                  filters: [
                    {
                      field: "married",
                      operation: FilterOperations.equal,
                      value: true,
                    },
                    {
                      field: "gender",
                      operation: FilterOperations.equal,
                      value: 1,
                    },
                  ],
                  operator: FilterOperators.and,
                },
              ],
              filters: [],
              operator: FilterOperators.or,
            },
          })
        );
      });
    });
  });
});
