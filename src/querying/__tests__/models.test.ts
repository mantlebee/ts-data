import {
  BrowseItemsPayload,
  FilterOperations,
  FilterOperators,
} from "@/browsing";
import { GenericItem } from "@/fake";

import { QueryableDataSource, Queryable } from "../models";

describe("Queryable", () => {
  it("It works!", async () => {
    let payload: BrowseItemsPayload<GenericItem> = {};
    const dataSource = new QueryableDataSource<GenericItem>((a) => {
      payload = a;
      return Promise.resolve([]);
    });
    await new Queryable(dataSource)
      .where("age")
      .isLessThan(18)
      .and("married")
      .isFalse()
      .or("married")
      .isTrue()
      .and("gender")
      .isEqualTo(1)
      .select("age", "email", "firstName", "gender", "id", "lastName")
      .sortBy("username", true)
      .skip(10)
      .top(5)
      .read();
    const resultingPayload: BrowseItemsPayload<GenericItem> = {
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
              { field: "gender", operation: FilterOperations.equal, value: 1 },
            ],
            operator: FilterOperators.and,
          },
        ],
        filters: [],
        operator: FilterOperators.or,
      },
      select: ["age", "email", "firstName", "gender", "id", "lastName"],
      sorts: [{ by: "username", asc: true }],
      skip: 10,
      top: 5,
    };
    expect(payload).toEqual(resultingPayload);
  });
});
