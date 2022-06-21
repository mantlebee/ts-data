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
      .isGreaterThan(18)
      .and("gender")
      .isEqualTo(1)
      .or("married")
      .isFalse()
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
                field: "married",
                operation: FilterOperations.equal,
                value: false,
              },
            ],
            operator: FilterOperators.or,
          },
        ],
        filters: [
          {
            field: "age",
            operation: FilterOperations.greaterThan,
            value: 18,
          },
          { field: "gender", operation: FilterOperations.equal, value: 1 },
        ],
        operator: FilterOperators.and,
      },
      select: ["age", "email", "firstName", "gender", "id", "lastName"],
      sorts: [{ by: "username", asc: true }],
      skip: 10,
      top: 5,
    };
    expect(payload).toEqual(resultingPayload);
  });
});
