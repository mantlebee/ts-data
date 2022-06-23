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
      .sortBy("marriedOn")
      .desc()
      .sortBy("lastName")
      .asc()
      .sortBy("firstName")
      .asc()
      .take(50)
      .startingFrom(10)
      .select("age", "email", "gender", "id")
      .select("firstName")
      .as("name")
      .select("lastName")
      .as("surname")
      .add(5)
      .as("parentId")
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
        { alias: "parentId", defaultValue: 5 },
      ],
      sorts: [
        { by: "marriedOn", asc: false },
        { by: "lastName", asc: true },
        { by: "firstName", asc: true },
      ],
      skip: 10,
      top: 50,
    };
    expect(payload).toEqual(resultingPayload);
  });
});
