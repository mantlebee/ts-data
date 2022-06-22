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
      .sortBy("username")
      .asc()
      .take(5)
      .startingFrom(10)
      .select("age", "email", "gender", "id")
      .select("firstName")
      .as("name")
      .select("lastName")
      .as("surname")
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
      selects: [
        { key: "age", alias: "age" },
        { key: "email", alias: "email" },
        { key: "gender", alias: "gender" },
        { key: "id", alias: "id" },
        { key: "firstName", alias: "name" },
        { key: "lastName", alias: "surname" },
      ],
      sorts: [{ by: "username", asc: true }],
      skip: 10,
      top: 5,
    };
    expect(payload).toEqual(resultingPayload);
  });
});
